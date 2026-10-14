import { NextRequest } from 'next/server';
import getDb from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { id as validId, InputError, apiError } from '@/lib/validation';
import { menuItem } from '@/lib/menu';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        if (!await getAuthUser()) return Response.json({ error: 'Unauthorized' }, { status: 401 });
        const id = validId((await params).id);
        const item = menuItem(await request.json());
        const sql = await getDb();
        const result = await sql`UPDATE menu_items SET name_no = ${item.name_no}, name_en = ${item.name_en}, desc_no = ${item.desc_no},
            desc_en = ${item.desc_en}, price = ${item.price}, is_active = ${item.is_active} WHERE id = ${id}`;
        if (!result.count) throw new InputError('Menu item not found', 404);
        return Response.json({ success: true });
    } catch (error) { return apiError(error); }
}
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        if (!await getAuthUser()) return Response.json({ error: 'Unauthorized' }, { status: 401 });
        const sql = await getDb();
        const result = await sql`DELETE FROM menu_items WHERE id = ${validId((await params).id)}`;
        if (!result.count) throw new InputError('Menu item not found', 404);
        return Response.json({ success: true });
    } catch (error) { return apiError(error); }
}
