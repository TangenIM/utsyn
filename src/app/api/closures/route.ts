import { NextRequest } from 'next/server';
import getDb from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { date, text, boolean, timeSlots, InputError, apiError } from '@/lib/validation';

export async function GET() {
    try {
        if (!await getAuthUser()) return Response.json({ error: 'Unauthorized' }, { status: 401 });
        const sql = await getDb();
        return Response.json(await sql`SELECT * FROM special_closures ORDER BY date`);
    } catch (error) { return apiError(error); }
}
export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
        if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
        const body = await request.json();
        const selected = date(body?.date);
        const reason_no = text(body?.reason_no ?? '', 'Norwegian reason');
        const reason_en = text(body?.reason_en ?? '', 'English reason');
        const is_closed = boolean(body?.is_closed ?? true, 'closed flag');
        const time_slots = timeSlots(body?.time_slots ?? '');
        if (!is_closed && !time_slots) throw new InputError('An open special day needs at least one time slot');
        const sql = await getDb();
        await sql.begin(async tx => {
            await tx`SELECT pg_advisory_xact_lock(728194)`;
            await tx`INSERT INTO special_closures (date,reason_no,reason_en,is_closed,time_slots) VALUES (${selected},${reason_no},${reason_en},${is_closed},${time_slots})
                ON CONFLICT (date) DO UPDATE SET reason_no = EXCLUDED.reason_no, reason_en = EXCLUDED.reason_en, is_closed = EXCLUDED.is_closed, time_slots = EXCLUDED.time_slots`;
        });
        return Response.json({ success: true }, { status: 201 });
    } catch (error) { return apiError(error); }
}
