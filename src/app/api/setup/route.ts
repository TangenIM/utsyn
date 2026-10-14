import { NextRequest } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import getDb from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { text, password as validPassword, InputError, apiError } from '@/lib/validation';

export async function GET() {
    try {
        const sql = await getDb();
        const [row] = await sql`SELECT COUNT(*) AS count FROM users`;
        return Response.json({ needsSetup: Number(row.count) === 0 }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const username = text(body?.username, 'username', 3, 64);
        const password = validPassword(body?.password);
        const display_name = text(body?.display_name || 'Administrator', 'display name', 1, 100);
        const expected = process.env.SETUP_TOKEN;
        const supplied = typeof body?.setup_token === 'string' ? body.setup_token : '';
        if (!expected) throw new InputError('SETUP_TOKEN is not configured', 503);
        const left = Buffer.from(supplied), right = Buffer.from(expected);
        if (left.length !== right.length || !timingSafeEqual(left, right)) throw new InputError('Invalid setup token', 403);
        const passwordHash = await hashPassword(password);
        const sql = await getDb();
        await sql.begin(async tx => {
            await tx`SELECT pg_advisory_xact_lock(728195)`;
            const [row] = await tx`SELECT COUNT(*) AS count FROM users`;
            if (Number(row.count) > 0) throw new InputError('Setup already completed', 409);
            await tx`INSERT INTO users (username,password_hash,display_name,role) VALUES (${username},${passwordHash},${display_name},'admin')`;
        });
        return Response.json({ success: true }, { status: 201 });
    } catch (error) { return apiError(error); }
}
