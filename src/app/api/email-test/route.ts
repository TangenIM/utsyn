import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { sendMail, layout, recipients } from '@/lib/email';
import { rateLimit } from '@/lib/rate-limit';
import { text, InputError, apiError } from '@/lib/validation';

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
        if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
        const body = await request.json();
        const to = recipients(text(body?.to, 'email', 5, 254));
        if (to.length !== 1) throw new InputError('Invalid email');
        await rateLimit('email-test', String(user.userId), 5, 600);
        const result = await sendMail(to, 'Test fra Restaurant Utsyn', 'Dette er en test av e-postoppsettet.',
            layout('Test av e-post', 'Dette er en test av e-postoppsettet. Mottar du denne, fungerer utsendingen.', [], 'Sendt fra adminpanelet.'));
        return Response.json(result, { status: result.status === 'sent' ? 200 : 502 });
    } catch (error) { return apiError(error); }
}
