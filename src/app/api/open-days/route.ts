import { NextRequest } from 'next/server';
import getDb from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { integer, boolean, text, timeSlots, TIME, InputError, apiError } from '@/lib/validation';

export async function GET(request: NextRequest) {
    try {
        const sql = await getDb();
        const days = await sql`SELECT * FROM open_days ORDER BY day_of_week`;
        if (request.nextUrl.searchParams.get('calendar') === 'true') {
            const exceptions = await sql`SELECT date,is_closed,time_slots FROM special_closures WHERE date >= TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') ORDER BY date`;
            return Response.json({ days, exceptions }, { headers: { 'Cache-Control': 'no-store' } });
        }
        return Response.json(days, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) { return apiError(error); }
}
export async function PUT(request: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
        if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
        const body = await request.json();
        if (!Array.isArray(body) || body.length > 7) throw new InputError('Expected at most seven weekdays');
        const days = body.map(day => {
            const day_of_week = integer(day?.day_of_week, 'weekday', 0, 6);
            const open_time = text(day?.open_time, 'opening time', 5, 5);
            const close_time = text(day?.close_time, 'closing time', 5, 5);
            if (!TIME.test(open_time) || !TIME.test(close_time)) throw new InputError('Use HH:MM');
            const is_active = boolean(day?.is_active, 'active flag');
            const time_slots = timeSlots(day?.time_slots ?? '');
            if (is_active && !time_slots && open_time >= close_time) throw new InputError('Closing time must be after opening time');
            return { day_of_week, open_time, close_time, is_active, time_slots };
        });
        if (new Set(days.map(d => d.day_of_week)).size !== days.length) throw new InputError('Duplicate weekdays');
        const sql = await getDb();
        await sql.begin(async tx => {
            await tx`SELECT pg_advisory_xact_lock(728194)`;
            for (const day of days) await tx`UPDATE open_days SET open_time = ${day.open_time}, close_time = ${day.close_time}, is_active = ${day.is_active}, time_slots = ${day.time_slots} WHERE day_of_week = ${day.day_of_week}`;
        });
        return Response.json({ success: true });
    } catch (error) { return apiError(error); }
}
