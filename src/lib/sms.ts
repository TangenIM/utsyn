import getDb from './db';
import { phone as normalizePhone } from './validation';
import { sendMail, layout, recipients } from './email';
import type postgres from 'postgres';

export type SmsResult = { status: 'queued' | 'sent' | 'failed' | 'disabled'; message_sid?: string; error_code?: string };
type Reservation = { id: number; guest_name?: string; phone: string; email?: string; comment?: string; date: string; time_slot: string; guests_count: number; confirmation_code: string; locale?: string };
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

export async function providerSettings(sql: postgres.Sql) {
    const rows = await sql`SELECT key, value FROM settings WHERE key IN ('sms_provider','email_staff_recipients')`;
    const settings = Object.fromEntries(rows.map(row => [row.key, row.value]));
    return { provider: process.env.SMS_PROVIDER || settings.sms_provider || 'disabled', staff: settings.email_staff_recipients as string | undefined };
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

function formatDate(reservation: Reservation): string {
    return new Intl.DateTimeFormat(reservation.locale === 'en' ? 'en-GB' : 'nb-NO', {
        day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Oslo',
    }).format(new Date(`${reservation.date}T12:00:00Z`));
}

export function renderSms(template: string, reservation: Reservation): string {
    const formattedDate = formatDate(reservation);
    const replacements: Record<string, string> = { kode: reservation.confirmation_code, dato: formattedDate, tid: reservation.time_slot, antall: String(reservation.guests_count) };
    return template.replace(/\{(kode|dato|tid|antall)\}/g, (_, key: string) => replacements[key]);
}

const english: Record<SmsEvent, string> = {
    received: 'Restaurant Utsyn: We received your booking for {dato} at {tid}, {antall} guests. Code: {kode}. We will confirm your table shortly.',
    confirmed: 'Restaurant Utsyn: Your table is confirmed for {dato} at {tid}, {antall} guests. Code: {kode}. Welcome!',
    cancelled: 'Restaurant Utsyn: Your booking for {dato} at {tid} has been cancelled. Code: {kode}. Please contact the restaurant if this is unexpected.',
    noshow: 'Restaurant Utsyn: We missed you at your booking on {dato} at {tid}. Code: {kode}. Please contact the restaurant if this is incorrect.',
};

const subjects: Record<'no' | 'en', Record<SmsEvent, string>> = {
    no: { received: 'Vi har mottatt bestillingen din', confirmed: 'Bordet ditt er bekreftet', cancelled: 'Reservasjonen din er kansellert', noshow: 'Du møtte ikke til reservasjonen' },
    en: { received: 'We received your booking', confirmed: 'Your table is confirmed', cancelled: 'Your booking has been cancelled', noshow: 'We missed you at your booking' },
};
const labels = {
    no: { date: 'Dato', time: 'Tid', guests: 'Antall gjester', code: 'Bestillingskode', footer: 'Restaurant Utsyn, opplæringsrestaurant på Tangen videregående skole. Svar på denne e-posten kommer ikke frem. Kontakt restauranten ved spørsmål.' },
    en: { date: 'Date', time: 'Time', guests: 'Guests', code: 'Booking code', footer: 'Restaurant Utsyn, training restaurant at Tangen Upper Secondary School. Replies to this email are not read. Please contact the restaurant with any questions.' },
};

async function sendReservationEmail(reservation: Reservation, event: SmsEvent, message: string, staff: string[]): Promise<SmsResult> {
    const lang = reservation.locale === 'en' ? 'en' : 'no', l = labels[lang], date = formatDate(reservation);
    const details: [string, string][] = [[l.date, date], [l.time, reservation.time_slot], [l.guests, String(reservation.guests_count)], [l.code, reservation.confirmation_code]];
    const subject = `${subjects[lang][event]}, ${date} ${reservation.time_slot}`;
    const lines = (rows: [string, string][]) => rows.map(([k, v]) => `${k}: ${v}`).join('\n');
    const guest = sendMail(recipients(reservation.email), subject, `${message}\n\n${lines(details)}\n\n${l.footer}`, layout(subjects[lang][event], message, details, l.footer));
    if (event !== 'received' || !staff.length) return guest;
    const info: [string, string][] = [['Navn', reservation.guest_name || ''], ['Telefon', reservation.phone], ['E-post', reservation.email || ''], ['Dato', date], ['Tid', reservation.time_slot], ['Antall gjester', String(reservation.guests_count)], ['Kommentar', reservation.comment || '-'], ['Bestillingskode', reservation.confirmation_code]];
    const note = sendMail(staff, `Ny bestilling: ${date} ${reservation.time_slot}, ${reservation.guests_count} gjester`, lines(info),
        layout('Ny bestilling', 'En ny bestilling venter på bord i adminpanelet.', info, 'Automatisk varsel fra bestillingssystemet.'));
    const [result, staffResult] = await Promise.all([guest, note]);
    if (staffResult.status === 'failed') console.error('Staff notification failed', { code: staffResult.error_code });
    return result;
}

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
        const settings = await providerSettings(sql);
        const message = template ? renderSms(template, reservation) : '';
        const result = !template ? { status: 'disabled' as const }
            : settings.provider === 'email' ? await sendReservationEmail(reservation, event, message, recipients(process.env.EMAIL_STAFF_RECIPIENTS || settings.staff))
            : await sendSms(reservation.phone, message);
        await sql`UPDATE sms_notifications SET status = ${result.status}, message_sid = ${result.message_sid || null}, error_code = ${result.error_code || null} WHERE id = ${notification.id}`;
        return result;
    } catch {
        // The reservation already committed. Never tell the guest to submit it again.
        return { status: 'failed', error_code: 'notification_unavailable' };
    }
}
