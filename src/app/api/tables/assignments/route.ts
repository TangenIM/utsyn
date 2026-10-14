import { NextRequest } from 'next/server';
import getDb from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { integer, id, date, InputError, apiError } from '@/lib/validation';

export async function GET(request: NextRequest) {
    try {
        if (!await getAuthUser()) return Response.json({ error: 'Unauthorized' }, { status: 401 });
        const selected = date(request.nextUrl.searchParams.get('date'));
        const sql = await getDb();
        return Response.json(await sql`SELECT a.id,a.reservation_id,a.table_id,r.guest_name,r.time_slot,r.guests_count,r.status
            FROM table_assignments a JOIN reservations r ON r.id = a.reservation_id WHERE r.date = ${selected} AND r.status IN ('needs_seat','confirmed','completed')`);
    } catch (error) { return apiError(error); }
}
export async function POST(request: NextRequest) {
    try {
        if (!await getAuthUser()) return Response.json({ error: 'Unauthorized' }, { status: 401 });
        const body = await request.json();
        const reservation_id = integer(body?.reservation_id, 'reservation ID');
        const table_id = integer(body?.table_id, 'table ID');
        const sql = await getDb();
        await sql.begin(async tx => {
            await tx`SELECT pg_advisory_xact_lock(728194)`;
            const [reservation] = await tx`SELECT * FROM reservations WHERE id = ${reservation_id}`;
            if (!reservation) throw new InputError('Reservation not found', 404);
            if (!['needs_seat','confirmed'].includes(reservation.status)) throw new InputError('This reservation cannot be seated', 409);
            const [table] = await tx`SELECT * FROM tables_config WHERE id = ${table_id}`;
            if (!table) throw new InputError('Table not found', 404);
            if (!table.is_active || table.capacity < 1) throw new InputError('Table is inactive', 409);
            const conflict = await tx`SELECT a.id FROM table_assignments a JOIN reservations r ON r.id = a.reservation_id
                WHERE a.table_id = ${table_id} AND r.date = ${reservation.date} AND r.time_slot = ${reservation.time_slot}
                AND r.id != ${reservation_id} AND r.status IN ('needs_seat','confirmed','completed')`;
            if (conflict.length) throw new InputError('This table is already assigned at this time', 409);
            await tx`INSERT INTO table_assignments (reservation_id,table_id) VALUES (${reservation_id},${table_id}) ON CONFLICT DO NOTHING`;
        });
        return Response.json({ success: true });
    } catch (error) { return apiError(error); }
}
export async function DELETE(request: NextRequest) {
    try {
        if (!await getAuthUser()) return Response.json({ error: 'Unauthorized' }, { status: 401 });
        const reservation_id = id(request.nextUrl.searchParams.get('reservation_id') || '');
        const raw = request.nextUrl.searchParams.get('table_id');
        const table_id = raw ? id(raw) : null;
        const sql = await getDb();
        await sql.begin(async tx => {
            await tx`SELECT pg_advisory_xact_lock(728194)`;
            await tx`DELETE FROM table_assignments WHERE reservation_id = ${reservation_id} ${table_id ? tx`AND table_id = ${table_id}` : tx``}`;
            await tx`UPDATE reservations r SET status = 'needs_seat' WHERE id = ${reservation_id} AND status = 'confirmed'
                AND guests_count > (SELECT COALESCE(SUM(t.capacity),0) FROM table_assignments a JOIN tables_config t ON t.id = a.table_id WHERE a.reservation_id = r.id AND t.is_active)`;
        });
        return Response.json({ success: true });
    } catch (error) { return apiError(error); }
}
