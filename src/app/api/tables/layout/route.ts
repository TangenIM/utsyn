import { NextRequest } from 'next/server';
import getDb from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { date, InputError, apiError } from '@/lib/validation';

export async function GET(request: NextRequest) {
    try {
        if (!await getAuthUser()) return Response.json({ error: 'Unauthorized' }, { status: 401 });
        const selected = date(request.nextUrl.searchParams.get('date'));
        const sql = await getDb();
        const [row] = await sql`SELECT positions FROM floor_layouts WHERE key IN ('permanent',${selected}) ORDER BY (key = ${selected}) DESC LIMIT 1`;
        return Response.json({ positions: row?.positions || null }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) { return apiError(error); }
}
export async function PUT(request: NextRequest) {
    try {
        if ((await getAuthUser())?.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });
        const body = await request.json();
        const key = body?.key === 'permanent' ? 'permanent' : date(body?.key);
        const positions = body?.positions;
        if (!positions || typeof positions !== 'object' || Array.isArray(positions) || Object.keys(positions).length > 100) throw new InputError('Invalid layout');
        for (const [tableId, position] of Object.entries(positions)) {
            const point = position as { x: number; y: number; rotate?: number };
            if (!/^[1-9]\d*$/.test(tableId) || !point || !Number.isFinite(point.x) || !Number.isFinite(point.y) ||
                point.x < 0 || point.x > 100 || point.y < 0 || point.y > 100 || (point.rotate !== undefined && (!Number.isFinite(point.rotate) || point.rotate < 0 || point.rotate >= 360))) throw new InputError('Invalid table position');
        }
        const sql = await getDb();
        const tableIds = new Set((await sql`SELECT id FROM tables_config`).map(t => String(t.id)));
        if (Object.keys(positions).some(id => !tableIds.has(id))) throw new InputError('Unknown table');
        await sql`INSERT INTO floor_layouts (key,positions) VALUES (${key},${sql.json(positions)}) ON CONFLICT (key) DO UPDATE SET positions = EXCLUDED.positions, updated_at = CURRENT_TIMESTAMP`;
        return Response.json({ success: true });
    } catch (error) { return apiError(error); }
}
export async function DELETE(request: NextRequest) {
    try {
        if ((await getAuthUser())?.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });
        const selected = request.nextUrl.searchParams.get('key') === 'permanent' ? 'permanent' : date(request.nextUrl.searchParams.get('date'));
        const sql = await getDb();
        await sql`DELETE FROM floor_layouts WHERE key = ${selected}`;
        return Response.json({ success: true });
    } catch (error) { return apiError(error); }
}
