import { NextRequest } from 'next/server';
import getDb from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { text, integer, apiError } from '@/lib/validation';

export async function POST(request: NextRequest) {
    try {
        if ((await getAuthUser())?.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });
        const body = await request.json();
        const name_no = text(body?.name_no, 'Norwegian name', 1, 100);
        const name_en = text(body?.name_en, 'English name', 1, 100);
        const sort_order = integer(body?.sort_order ?? 0, 'sort order', 0, 10000);
        const sql = await getDb();
        const [created] = await sql`INSERT INTO menu_categories (name_no,name_en,sort_order) VALUES (${name_no},${name_en},${sort_order}) RETURNING id`;
        return Response.json({ success: true, id: created.id }, { status: 201 });
    } catch (error) { return apiError(error); }
}
