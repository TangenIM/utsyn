import { NextRequest } from 'next/server';
import getDb from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { id, InputError, apiError } from '@/lib/validation';

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        if ((await getAuthUser())?.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });
        const sql = await getDb();
        await sql.begin(async tx => {
            await tx`SELECT pg_advisory_xact_lock(728194)`;
            const result = await tx`DELETE FROM special_closures WHERE id = ${id((await params).id)}`;
            if (!result.count) throw new InputError('Special day not found', 404);
        });
        return Response.json({ success: true });
    } catch (error) { return apiError(error); }
}
