import { createHash } from 'node:crypto';
import getDb from './db';
import { InputError } from './validation';

export async function rateLimit(scope: string, identity: string, limit: number, seconds: number) {
    const sql = await getDb();
    const key = `${scope}:${createHash('sha256').update(identity).digest('hex')}`;
    await sql`DELETE FROM api_rate_limits WHERE reset_at < CURRENT_TIMESTAMP`;
    const [row] = await sql`INSERT INTO api_rate_limits (key,count,reset_at) VALUES (${key},1,CURRENT_TIMESTAMP + ${seconds} * INTERVAL '1 second')
        ON CONFLICT (key) DO UPDATE SET count = api_rate_limits.count + 1 RETURNING count`;
    if (row.count > limit) throw new InputError('Too many requests. Please try again later.', 429);
}
