import getDb from './db';
import { phone as normalizePhone } from './validation';
import type postgres from 'postgres';

export type SmsResult = { status: 'queued' | 'sent' | 'failed' | 'disabled'; message_sid?: string; error_code?: string };
type Reservation = { id: number; phone: string; date: string; time_slot: string; guests_count: number; confirmation_code: string; locale?: string };
export type SmsEvent = 'received' | 'confirmed' | 'cancelled' | 'noshow';

export async function refreshSms(sid: string) {
    if (!/^SM[0-9a-f]{32}$/i.test(sid)) return null;
    const sql = await getDb();
    const rows = await sql`SELECT key,value FROM settings WHERE key IN ('sms_twilio_sid','sms_twilio_token')`;
    const settings = Object.fromEntries(rows.map(row => [row.key,row.value]));
    const account = process.env.TWILIO_ACCOUNT_SID || settings.sms_twilio_sid;
    const token = process.env.TWILIO_AUTH_TOKEN || settings.sms_twilio_token;
    if (!account || !token) return null;
    try {
        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${account}/Messages/${sid}.json`, {
            headers: { Authorization: `Basic ${Buffer.from(`${account}:${token}`).toString('base64')}` },
            signal: AbortSignal.timeout(10000), redirect: 'error', cache: 'no-store',
        });
        if (!res.ok) return null;
        const result = await res.json();
        if (!['queued','sending','sent','delivered','failed','undelivered','accepted','scheduled','canceled','read'].includes(result.status)) return null;
        return { status: result.status as string, error_code: result.error_code ? String(result.error_code) : null };
    } catch { return null; }
}

export async function queueSms(sql: postgres.TransactionSql, reservationId: number, event: SmsEvent) {
    await sql`INSERT INTO sms_notifications (reservation_id,event,status) VALUES (${reservationId},${event},'pending')`;
}

export async function sendSms(phone: string, message: string): Promise<SmsResult> {
    try {
        const sql = await getDb();
        const rows = await sql`SELECT key, value FROM settings WHERE key LIKE 'sms_%'`;
        const settings = Object.fromEntries(rows.map(row => [row.key, row.value]));
        const provider = process.env.SMS_PROVIDER || settings.sms_provider || 'disabled';
        if (provider === 'disabled') return { status: 'disabled' };
        const to = normalizePhone(phone);
        if (provider === 'twilio') {
            const sid = process.env.TWILIO_ACCOUNT_SID || settings.sms_twilio_sid;
            const token = process.env.TWILIO_AUTH_TOKEN || settings.sms_twilio_token;
            const from = process.env.TWILIO_FROM_NUMBER || settings.sms_twilio_from;
            if (!/^AC[0-9a-f]{32}$/i.test(sid || '') || !token || !from) return { status: 'failed', error_code: 'configuration_missing' };
            const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
                method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ To: to, From: normalizePhone(from), Body: message }),
                signal: AbortSignal.timeout(15000), redirect: 'error',
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) return { status: 'failed', error_code: String(data.code || res.status) };
            if (typeof data.sid !== 'string' || !/^SM[0-9a-f]{32}$/i.test(data.sid)) return { status: 'failed', error_code: 'invalid_provider_response' };
            return { status: ['failed', 'undelivered'].includes(data.status) ? 'failed' : 'queued', message_sid: data.sid, ...(data.error_code ? { error_code: String(data.error_code) } : {}) };
        }
        if (provider === 'webhook' && settings.sms_webhook_url) {
            const res = await fetch(settings.sms_webhook_url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: to, message }), signal: AbortSignal.timeout(15000), redirect: 'error' });
            return res.ok ? { status: 'sent' } : { status: 'failed', error_code: String(res.status) };
        }
        return { status: 'failed', error_code: 'configuration_missing' };
    } catch {
        return { status: 'failed', error_code: 'provider_unavailable' };
    }
}

export function renderSms(template: string, reservation: Reservation): string {
    const formattedDate = new Intl.DateTimeFormat(reservation.locale === 'en' ? 'en-GB' : 'nb-NO', {
        day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Oslo',
    }).format(new Date(`${reservation.date}T12:00:00Z`));
    const replacements: Record<string, string> = { kode: reservation.confirmation_code, dato: formattedDate, tid: reservation.time_slot, antall: String(reservation.guests_count) };
    return template.replace(/\{(kode|dato|tid|antall)\}/g, (_, key: string) => replacements[key]);
}

const english: Record<SmsEvent, string> = {
    received: 'Restaurant Utsyn: We received your booking for {dato} at {tid}, {antall} guests. Code: {kode}. We will confirm your table shortly.',
    confirmed: 'Restaurant Utsyn: Your table is confirmed for {dato} at {tid}, {antall} guests. Code: {kode}. Welcome!',
    cancelled: 'Restaurant Utsyn: Your booking for {dato} at {tid} has been cancelled. Code: {kode}. Please contact the restaurant if this is unexpected.',
    noshow: 'Restaurant Utsyn: We missed you at your booking on {dato} at {tid}. Code: {kode}. Please contact the restaurant if this is incorrect.',
};

export async function notifyReservation(reservation: Reservation, event: SmsEvent, retryId?: number): Promise<SmsResult> {
    try {
        const sql = await getDb();
        const [notification] = retryId ? await sql`UPDATE sms_notifications SET status = 'sending'
            WHERE id = ${retryId} AND reservation_id = ${reservation.id} AND event = ${event} AND status = 'retrying' RETURNING id`
            : await sql`UPDATE sms_notifications SET status = 'sending' WHERE id = (
            SELECT id FROM sms_notifications WHERE reservation_id = ${reservation.id} AND event = ${event} AND status = 'pending' ORDER BY id LIMIT 1
        ) AND status = 'pending' RETURNING id`;
        if (!notification) return { status: 'failed', error_code: 'already_processing' };
        const [row] = await sql`SELECT value FROM settings WHERE key = ${`sms_template_${event}`}`;
        const template = reservation.locale === 'en' ? english[event] : row?.value;
        const result = template ? await sendSms(reservation.phone, renderSms(template, reservation)) : { status: 'disabled' as const };
        await sql`UPDATE sms_notifications SET status = ${result.status}, message_sid = ${result.message_sid || null}, error_code = ${result.error_code || null} WHERE id = ${notification.id}`;
        return result;
    } catch {
        // The reservation already committed. Never tell the guest to submit it again.
        return { status: 'failed', error_code: 'notification_unavailable' };
    }
}
