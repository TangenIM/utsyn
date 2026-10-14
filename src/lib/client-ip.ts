import { isIP } from 'node:net';

export function clientIp(request: Request): string {
    // Enable only behind a gateway that controls this header and prevents direct access.
    if (process.env.TRUST_PROXY !== 'true') return 'unknown';
    const candidate = request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() || '';
    return isIP(candidate) ? candidate : 'unknown';
}
