import getDb from './db';
import { availability } from './availability';
import { InputError } from './validation';
import { notifyReservation, queueSms, type SmsEvent } from './sms';

export async function changeStatus(id: number, status: string, requirePending = false) {
    const sql = await getDb();
    const event: SmsEvent | undefined = status === 'confirmed' ? 'confirmed' : status === 'cancelled' ? 'cancelled' : status === 'no_show' ? 'noshow' : undefined;
    const { reservation, changed } = await sql.begin(async tx => {
        await tx`SELECT pg_advisory_xact_lock(728194)`;
        const [reservation] = await tx`SELECT * FROM reservations WHERE id = ${id} FOR UPDATE`;
        if (!reservation) throw new InputError('Reservation not found', 404);
        if (requirePending && reservation.status !== 'needs_seat') throw new InputError('Reservation is not awaiting confirmation', 409);
        if (reservation.status === status) return { reservation, changed: false };
        if (['cancelled','no_show'].includes(reservation.status) || ['cancelled','no_show'].includes(status)) {
            // Also clear historical assignments when restoring an older inactive booking.
            await tx`DELETE FROM table_assignments WHERE reservation_id = ${id}`;
        }
        if (status === 'confirmed') {
            const [capacity] = await tx`SELECT COALESCE(SUM(t.capacity),0) AS total FROM table_assignments a JOIN tables_config t ON t.id = a.table_id WHERE a.reservation_id = ${id} AND t.is_active`;
            if (Number(capacity.total) < reservation.guests_count) throw new InputError('Assign enough active table seats before confirming', 409);
            const conflicts = await tx`SELECT a.id FROM table_assignments a JOIN reservations r ON r.id = a.reservation_id
                WHERE a.table_id IN (SELECT table_id FROM table_assignments WHERE reservation_id = ${id})
                AND r.date = ${reservation.date} AND r.time_slot = ${reservation.time_slot} AND r.id != ${id}
                AND r.status IN ('needs_seat','confirmed','completed')`;
            if (conflicts.length) throw new InputError('An assigned table is occupied', 409);
        }
        if (['cancelled', 'no_show'].includes(reservation.status) && ['needs_seat', 'confirmed'].includes(status)) {
            const available = await availability(tx, reservation.date);
            const slot = available.slots.find(s => s.time === reservation.time_slot);
            if (!slot || slot.available < reservation.guests_count) throw new InputError('This booking can no longer be restored', 409);
        }
        await tx`UPDATE reservations SET status = ${status} WHERE id = ${id}`;
        if (event) await queueSms(tx, id, event);
        return { reservation, changed: true };
    });
    const sms = changed && event ? await notifyReservation(reservation as Parameters<typeof notifyReservation>[0], event) : undefined;
    return { success: true, changed, ...(sms ? { sms } : {}) };
}
