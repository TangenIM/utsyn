import { NextRequest } from 'next/server';
import getDb from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { id, InputError, apiError } from '@/lib/validation';

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        if ((await getAuthUser())?.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });
        const sql = await getDb();
        const result = await sql`DELETE FROM menu_categories WHERE id = ${id((await params).id)}`;
        if (!result.count) throw new InputError('Category not found', 404);
        return Response.json({ success: true });
    } catch (error) { return apiError(error); }
}
