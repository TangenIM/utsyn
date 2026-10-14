import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { verifyPassword, createToken, getTokenCookieOptions, getLogoutCookieOptions } from '@/lib/auth';
import { cookies } from 'next/headers';
import { text, apiError } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { clientIp } from '@/lib/client-ip';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const username = text(body?.username, 'username', 3, 64);
        if (typeof body?.password !== 'string' || body.password.length === 0 || Buffer.byteLength(body.password) > 72) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 400 });
        }
        const password = body.password;
        const address = clientIp(request);
        await rateLimit('login-user-ip', JSON.stringify([username,address]), 10, 900);
        await rateLimit('login-ip', address, 30, 900);

        if (!username || !password) {
            return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
        }

        const sql = await getDb();
        const users = await sql`SELECT * FROM users WHERE username = ${username}`;
        const user = users[0] as unknown as {
            id: number;
            username: string;
            password_hash: string;
            display_name: string;
            role: 'admin' | 'staff';
        } | undefined;

        if (!user) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const valid = await verifyPassword(password, user.password_hash);
        if (!valid) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const token = createToken({
            userId: user.id,
            username: user.username,
            role: user.role,
        });

        const cookieStore = await cookies();
        const cookieOptions = getTokenCookieOptions(token);
        cookieStore.set(cookieOptions);

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                display_name: user.display_name,
                role: user.role,
            },
        });
    } catch (error) {
        return apiError(error);
    }
}

export async function DELETE() {
    try {
        const cookieStore = await cookies();
        const logoutOptions = getLogoutCookieOptions();
        cookieStore.set(logoutOptions);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Logout error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
