import { NextRequest } from 'next/server';
import getDb from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { generateConfirmationCode, validateEmail } from '@/lib/utils';
import { availability } from '@/lib/availability';
import { text, integer, date as validDate, phone as normalizePhone, InputError, apiError, TIME } from '@/lib/validation';
import { notifyReservation, queueSms } from '@/lib/sms';
import { rateLimit } from '@/lib/rate-limit';
import { clientIp } from '@/lib/client-ip';

export async function GET(request: NextRequest) {
    try {
        if (!await getAuthUser()) return Response.json({ error: 'Unauthorized' }, { status: 401 });
        const { searchParams } = request.nextUrl;
        const date = searchParams.get('date'), from = searchParams.get('from'), to = searchParams.get('to'), status = searchParams.get('status');
        for (const value of [date, from, to]) if (value) validDate(value);
        if (status && !['all', 'needs_seat', 'confirmed', 'cancelled', 'completed', 'no_show'].includes(status)) throw new InputError('Invalid status');
        const sql = await getDb();
        const result = await sql`SELECT r.*, (SELECT status FROM sms_notifications WHERE reservation_id = r.id ORDER BY id DESC LIMIT 1) AS sms_status,
            (SELECT error_code FROM sms_notifications WHERE reservation_id = r.id ORDER BY id DESC LIMIT 1) AS sms_error_code
            FROM reservations r WHERE 1=1 ${date ? sql`AND date = ${date}` : sql``}
            ${from ? sql`AND date >= ${from}` : sql``} ${to ? sql`AND date <= ${to}` : sql``}
            ${status && status !== 'all' ? sql`AND status = ${status}` : sql``} ORDER BY date DESC, time_slot, id`;
        return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        if (!body || typeof body !== 'object' || Array.isArray(body)) throw new InputError('Invalid booking');
        const guest_name = text(body.guest_name, 'name', 2, 100);
        const phone = normalizePhone(body.phone);
        const email = text(body.email ?? '', 'email', 0, 254);
        if (!validateEmail(email)) throw new InputError('Invalid email');
        const guests_count = integer(body.guests_count, 'guest count', 1, 60);
        const date = validDate(body.date);
        const time_slot = text(body.time_slot, 'time slot', 5, 5);
        if (!TIME.test(time_slot)) throw new InputError('Invalid time slot');
        const comment = text(body.comment ?? '', 'comment');
        const locale = body.locale ?? 'no';
        if (!['no', 'en'].includes(locale)) throw new InputError('Invalid language');
        const requestKey = request.headers.get('idempotency-key');
        if (requestKey && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestKey)) throw new InputError('Invalid request key');
        await rateLimit('booking-ip', clientIp(request), 10, 60);
        const sql = await getDb();
        const { reservation, reused } = await sql.begin(async tx => {
            // All booking and seating writers lock before checking capacity.
            await tx`SELECT pg_advisory_xact_lock(728194)`;
            if (requestKey) {
                const [existing] = await tx`SELECT * FROM reservations WHERE request_key = ${requestKey}`;
                if (existing) {
                    if (existing.phone !== phone || existing.date !== date || existing.time_slot !== time_slot || existing.guests_count !== guests_count) throw new InputError('Request key already belongs to another booking', 409);
                    return { reservation: existing, reused: true };
                }
            }
            const available = await availability(tx, date);
            const slot = available.slots.find(s => s.time === time_slot);
            if (available.closed || !slot) throw new InputError('This time is not available');
            if (slot.available < guests_count) throw new InputError('Not enough capacity for this time slot', 409);
            const [recent] = await tx`SELECT COUNT(*) AS count FROM reservations WHERE phone = ${phone} AND created_at > CURRENT_TIMESTAMP - INTERVAL '1 minute'`;
            if (Number(recent.count) >= 3) throw new InputError('Too many bookings. Please wait a minute.', 429);
            const [created] = await tx`INSERT INTO reservations (guest_name, phone, email, guests_count, date, time_slot, comment, locale, confirmation_code, request_key)
                VALUES (${guest_name}, ${phone}, ${email}, ${guests_count}, ${date}, ${time_slot}, ${comment}, ${locale}, ${generateConfirmationCode()}, ${requestKey}) RETURNING *`;
            await queueSms(tx, created.id, 'received');
            return { reservation: created, reused: false };
        });
        const [previous] = reused ? await sql`SELECT status,error_code FROM sms_notifications WHERE reservation_id = ${reservation.id} ORDER BY id DESC LIMIT 1` : [];
        const sms = reused ? { status: previous?.status || 'pending', error_code: previous?.error_code } : await notifyReservation(reservation as Parameters<typeof notifyReservation>[0], 'received');
        return Response.json({ success: true, id: reservation.id, confirmation_code: reservation.confirmation_code, sms }, { status: 201 });
    } catch (error) { return apiError(error); }
}
