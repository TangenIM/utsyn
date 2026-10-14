import { NextRequest } from 'next/server';
import getDb from '@/lib/db';
import { availability } from '@/lib/availability';
import { date, apiError } from '@/lib/validation';

export async function GET(request: NextRequest) {
    try {
        const selected = date(request.nextUrl.searchParams.get('date'));
        return Response.json(await availability(await getDb(), selected), { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) { return apiError(error); }
}
