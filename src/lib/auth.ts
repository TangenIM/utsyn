import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import getDb from './db';

function jwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) throw new Error('Set JWT_SECRET to at least 32 random characters');
    return secret;
}
const COOKIE_NAME = 'utsyn_auth';

export interface JwtPayload {
    userId: number;
    username: string;
    role: 'admin' | 'staff';
}

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

export function createToken(payload: JwtPayload): string {
    return jwt.sign(payload, jwtSecret(), { expiresIn: '8h', algorithm: 'HS256' });
}

export function verifyToken(token: string): JwtPayload | null {
    try {
        const payload = jwt.verify(token, jwtSecret(), { algorithms: ['HS256'] }) as JwtPayload;
        return Number.isSafeInteger(payload.userId) && ['admin', 'staff'].includes(payload.role) ? payload : null;
    } catch {
        return null;
    }
}

export async function getAuthUser(): Promise<JwtPayload | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const payload = verifyToken(token);
    if (!payload) return null;
    const sql = await getDb();
    const [user] = await sql`SELECT id, username, role FROM users WHERE id = ${payload.userId}`;
    return user ? { userId: user.id, username: user.username, role: user.role } : null;
}

export function getTokenCookieOptions(token: string) {
    return {
        name: COOKIE_NAME,
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
        maxAge: 28800, // 8 hours
    };
}

export function getLogoutCookieOptions() {
    return {
        name: COOKIE_NAME,
        value: '',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
        maxAge: 0,
    };
}
