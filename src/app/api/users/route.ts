import { NextRequest } from 'next/server';
import getDb from '@/lib/db';
import { hashPassword, getAuthUser } from '@/lib/auth';
import { text, password, InputError, apiError } from '@/lib/validation';

export async function GET() {
    try {
        if ((await getAuthUser())?.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });
        const sql = await getDb();
        return Response.json(await sql`SELECT id,username,display_name,role,created_at FROM users ORDER BY id DESC`, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) { return apiError(error); }
}
export async function POST(request: NextRequest) {
    try {
        if ((await getAuthUser())?.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });
        const body = await request.json();
        const username = text(body?.username, 'username', 3, 64);
        const secret = password(body?.password);
        const display_name = text(body?.display_name || username, 'display name', 1, 100);
        const role = body?.role;
        if (!['admin','staff'].includes(role)) throw new InputError('Invalid role');
        const sql = await getDb();
        const hash = await hashPassword(secret);
        const [user] = await sql`INSERT INTO users (username,password_hash,display_name,role) VALUES (${username},${hash},${display_name},${role}) RETURNING id`;
        return Response.json({ success: true, id: user.id }, { status: 201 });
    } catch (error) { return apiError(error); }
}
