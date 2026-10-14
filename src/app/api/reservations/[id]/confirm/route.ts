import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { changeStatus } from '@/lib/reservations';
import { id, apiError } from '@/lib/validation';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        if (!await getAuthUser()) return Response.json({ error: 'Unauthorized' }, { status: 401 });
        return Response.json(await changeStatus(id((await params).id), 'confirmed', true));
    } catch (error) { return apiError(error); }
}
