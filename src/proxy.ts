import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
        const origin = request.headers.get('origin');
        const host = request.headers.get('host');
        const localOrigin = host ? `${request.nextUrl.protocol}//${host}` : request.nextUrl.origin;
        const allowedOrigin = process.env.APP_URL ? new URL(process.env.APP_URL).origin : localOrigin;
        if ((origin && origin !== allowedOrigin) || request.headers.get('sec-fetch-site') === 'cross-site') {
            return NextResponse.json({ error: 'Cross-site request rejected' }, { status: 403 });
        }
        const length = Number(request.headers.get('content-length') || 0);
        if (length > 32768) return NextResponse.json({ error: 'Request too large' }, { status: 413 });
    }
    return NextResponse.next();
}
export const config = { matcher: '/api/:path*' };
