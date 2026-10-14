import { NextRequest } from 'next/server';
import getDb from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { changeStatus } from '@/lib/reservations';
import { id as validId, InputError, apiError } from '@/lib/validation';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        if (!await getAuthUser()) return Response.json({ error: 'Unauthorized' }, { status: 401 });
        const id = validId((await params).id);
        const body = await request.json();
        const status = body?.status;
        if (!['confirmed','cancelled','completed','no_show','needs_seat'].includes(status)) throw new InputError('Invalid status');
        return Response.json(await changeStatus(id, status));
    } catch (error) { return apiError(error); }
}
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        if (!await getAuthUser()) return Response.json({ error: 'Unauthorized' }, { status: 401 });
        const id = validId((await params).id);
        const sql = await getDb();
        await sql.begin(async tx => {
            await tx`SELECT pg_advisory_xact_lock(728194)`;
            const result = await tx`DELETE FROM reservations WHERE id = ${id}`;
            if (!result.count) throw new InputError('Reservation not found', 404);
        });
        return Response.json({ success: true });
    } catch (error) { return apiError(error); }
}
