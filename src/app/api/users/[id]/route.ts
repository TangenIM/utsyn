import { NextRequest } from 'next/server';
import getDb from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { id as validId, InputError, apiError } from '@/lib/validation';

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getAuthUser();
        if (user?.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });
        const id = validId((await params).id);
        if (id === user.userId) throw new InputError('Cannot delete your own account');
        const sql = await getDb();
        await sql.begin(async tx => {
            await tx`SELECT pg_advisory_xact_lock(728195)`;
            // The actor may have been deleted while waiting for another admin.
            const [actor] = await tx`SELECT role FROM users WHERE id = ${user.userId}`;
            if (actor?.role !== 'admin') throw new InputError('Admin access required',403);
            const result = await tx`DELETE FROM users WHERE id = ${id}`;
            if (!result.count) throw new InputError('User not found', 404);
        });
        return Response.json({ success: true });
    } catch (error) { return apiError(error); }
}
