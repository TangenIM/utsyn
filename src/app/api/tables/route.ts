import { NextRequest } from 'next/server';
import getDb from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { integer, boolean, InputError, apiError } from '@/lib/validation';

export async function GET() {
    try {
        if (!await getAuthUser()) return Response.json({ error: 'Unauthorized' }, { status: 401 });
        const sql = await getDb();
        return Response.json(await sql`SELECT id,name,capacity,is_active FROM tables_config ORDER BY id`);
    } catch (error) { return apiError(error); }
}
export async function PUT(request: NextRequest) {
    try {
        if (!await getAuthUser()) return Response.json({ error: 'Unauthorized' }, { status: 401 });
        const body = await request.json();
        const id = integer(body?.id, 'table ID');
        const capacity = integer(body?.capacity, 'capacity', 0, 60);
        const active = boolean(body?.is_active, 'active flag');
        const sql = await getDb();
        await sql.begin(async tx => {
            await tx`SELECT pg_advisory_xact_lock(728194)`;
            const result = await tx`UPDATE tables_config SET capacity = ${capacity}, is_active = ${active} WHERE id = ${id}`;
            if (!result.count) throw new InputError('Table not found', 404);
            await tx`UPDATE reservations r SET status = 'needs_seat' WHERE status = 'confirmed'
                AND id IN (SELECT reservation_id FROM table_assignments WHERE table_id = ${id})
                AND guests_count > (SELECT COALESCE(SUM(t.capacity),0) FROM table_assignments a JOIN tables_config t ON t.id = a.table_id WHERE a.reservation_id = r.id AND t.is_active)`;
        });
        return Response.json({ success: true });
    } catch (error) { return apiError(error); }
}
