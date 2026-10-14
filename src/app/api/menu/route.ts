import { NextRequest } from 'next/server';
import getDb from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { integer, apiError } from '@/lib/validation';
import { menuItem } from '@/lib/menu';

export async function GET() {
    try {
        const sql = await getDb();
        const categories = await sql`SELECT * FROM menu_categories ORDER BY sort_order,id`;
        const user = await getAuthUser();
        const items = await sql`SELECT * FROM menu_items ${user ? sql`` : sql`WHERE is_active`} ORDER BY id`;
        return Response.json(categories.map(category => ({ ...category, items: items.filter(item => item.category_id === category.id) })), { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) { return apiError(error); }
}
export async function POST(request: NextRequest) {
    try {
        if (!await getAuthUser()) return Response.json({ error: 'Unauthorized' }, { status: 401 });
        const body = await request.json();
        const item = menuItem(body);
        const category_id = integer(body?.category_id, 'category ID');
        const sql = await getDb();
        const [created] = await sql`INSERT INTO menu_items (category_id,name_no,name_en,desc_no,desc_en,price,is_active)
            VALUES (${category_id},${item.name_no},${item.name_en},${item.desc_no},${item.desc_en},${item.price},${item.is_active}) RETURNING id`;
        return Response.json({ success: true, id: created.id }, { status: 201 });
    } catch (error) { return apiError(error); }
}
