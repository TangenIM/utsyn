import { NextRequest } from 'next/server';
import getDb from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { integer, InputError, apiError } from '@/lib/validation';
import { notifyReservation, refreshSms, type SmsEvent } from '@/lib/sms';

export async function GET(request: NextRequest) {
    try {
        if (!await getAuthUser()) return Response.json({ error:'Unauthorized' },{ status:401 });
        const sql = await getDb();
        const rows = await sql`SELECT n.*, r.confirmation_code, r.guest_name FROM sms_notifications n LEFT JOIN reservations r ON r.id = n.reservation_id ORDER BY n.id DESC LIMIT 50`;
        if (request.nextUrl.searchParams.get('refresh') === 'true') {
            await Promise.all(rows.filter(r => r.message_sid && ['queued','sending','sent','accepted'].includes(r.status)).slice(0,10).map(async row => {
                const status = await refreshSms(row.message_sid);
                if (status) {
                    await sql`UPDATE sms_notifications SET status = ${status.status}, error_code = ${status.error_code} WHERE id = ${row.id}`;
                    row.status = status.status;
                    row.error_code = status.error_code;
                }
            }));
        }
        return Response.json(rows, { headers:{ 'Cache-Control':'no-store' } });
    } catch(error) { return apiError(error); }
}
export async function POST(request: NextRequest) {
    try {
        if (!await getAuthUser()) return Response.json({ error:'Unauthorized' },{ status:401 });
        const body = await request.json();
        const id = integer(body?.id,'notification ID');
        const sql = await getDb();
        const notification = await sql.begin(async tx => {
            const [row] = await tx`SELECT n.*,r.status AS reservation_status FROM sms_notifications n JOIN reservations r ON r.id = n.reservation_id WHERE n.id = ${id} FOR UPDATE OF n`;
            if (!row) throw new InputError('Notification not found',404);
            if (!['pending','failed','undelivered','disabled'].includes(row.status)) throw new InputError('This notification is already sent or processing',409);
            if (['provider_unavailable','notification_unavailable','invalid_provider_response'].includes(row.error_code)) throw new InputError('Delivery is uncertain. Check provider logs before sending a new notification.',409);
            const relevant: Record<string,string[]> = {received:['needs_seat'],confirmed:['confirmed'],cancelled:['cancelled'],noshow:['no_show']};
            if (!relevant[row.event]?.includes(row.reservation_status)) throw new InputError('This notification no longer matches the reservation status',409);
            await tx`UPDATE sms_notifications SET status = 'retrying',message_sid = NULL,error_code = NULL WHERE id = ${id}`;
            return row;
        });
        const [reservation] = await sql`SELECT * FROM reservations WHERE id = ${notification.reservation_id}`;
        const sms = await notifyReservation(reservation as Parameters<typeof notifyReservation>[0],notification.event as SmsEvent, id);
        return Response.json({ success:true,sms });
    } catch(error) { return apiError(error); }
}
