import { NextRequest } from 'next/server';
import getDb from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { text, InputError, apiError } from '@/lib/validation';

const allowed = new Set(['hero_title_no','hero_title_en','hero_subtitle_no','hero_subtitle_en','about_text_no','about_text_en','address','phone','email','max_capacity','booking_cutoff_minutes','time_slot_interval','sms_provider','sms_webhook_url','sms_twilio_sid','sms_twilio_token','sms_twilio_from','sms_template_received','sms_template_confirmed','sms_template_cancelled','sms_template_noshow','currency','price_main','price_dessert']);
const publicKeys = new Set([...allowed].filter(key => !key.startsWith('sms_')));
const ranges: Record<string, [number, number]> = { max_capacity: [1,60], booking_cutoff_minutes: [0,1440], time_slot_interval: [1,240], price_main: [0,100000], price_dessert: [0,100000] };

export async function GET(request: NextRequest) {
    try {
        const admin = request.nextUrl.searchParams.get('scope') === 'admin';
        if (admin && (await getAuthUser())?.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });
        const sql = await getDb();
        const rows = await sql`SELECT key, value FROM settings`;
        const settings: Record<string, string> = {};
        for (const row of rows) {
            if (admin ? allowed.has(row.key) && row.key !== 'sms_twilio_token' : publicKeys.has(row.key)) settings[row.key] = row.value;
        }
        if (admin) {
            settings.sms_twilio_token_configured = String(!!process.env.TWILIO_AUTH_TOKEN || rows.some(r => r.key === 'sms_twilio_token' && !!r.value));
            settings.sms_environment_configured = String(!!process.env.SMS_PROVIDER);
            settings.sms_effective_provider = process.env.SMS_PROVIDER || settings.sms_provider || 'disabled';
        }
        return Response.json(settings, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) { return apiError(error); }
}

export async function PUT(request: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
        if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
        const body = await request.json();
        if (!body || typeof body !== 'object' || Array.isArray(body)) throw new InputError('Invalid settings');
        const entries: [string, string][] = [];
        for (const [key, input] of Object.entries(body)) {
            if (!allowed.has(key)) continue;
            const value = text(input, key, 0, 2000);
            if (ranges[key]) {
                const [min, max] = ranges[key];
                if (!/^\d+$/.test(value) || Number(value) < min || Number(value) > max) throw new InputError(`Invalid ${key}. Allowed range: ${min}-${max}`);
            }
            if (key === 'sms_provider' && !['disabled', 'twilio', 'webhook'].includes(value)) throw new InputError('Invalid SMS provider');
            if (key === 'sms_twilio_sid' && value && !/^AC[0-9a-f]{32}$/i.test(value)) throw new InputError('Invalid Twilio account SID');
            if (key === 'sms_twilio_from' && value && !/^\+[1-9]\d{7,14}$/.test(value)) throw new InputError('Twilio sender must use international format');
            if (key === 'sms_webhook_url' && value) {
                let url: URL;
                try { url = new URL(value); } catch { throw new InputError('Invalid webhook URL'); }
                if (url.protocol !== 'https:' || url.username || url.password) throw new InputError('Webhook must use HTTPS without URL credentials');
            }
            // Blank secret input keeps the stored token.
            if (key === 'sms_twilio_token' && !value) continue;
            entries.push([key, value]);
        }
        const sql = await getDb();
        await sql.begin(async tx => {
            await tx`SELECT pg_advisory_xact_lock(728194)`;
            for (const [key, value] of entries) await tx`INSERT INTO settings (key,value,updated_at) VALUES (${key},${value},CURRENT_TIMESTAMP)
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`;
        });
        return Response.json({ success: true });
    } catch (error) { return apiError(error); }
}
