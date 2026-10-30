import nodemailer from 'nodemailer';
import type { SmsResult } from './sms';

const CODES: Record<string, string> = { EAUTH: 'smtp_auth', ECONNECTION: 'smtp_unreachable', ETIMEDOUT: 'smtp_unreachable', ESOCKET: 'smtp_unreachable', EDNS: 'smtp_unreachable', EENVELOPE: 'invalid_recipient' };

export function smtpConfigured(): boolean {
    return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

export function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export function recipients(value: string | undefined): string[] {
    return [...new Set((value || '').split(/[,;\s]+/).map(s => s.trim()).filter(s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)))];
}

export async function sendMail(to: string[], subject: string, text: string, html: string): Promise<SmsResult> {
    if (!smtpConfigured()) return { status: 'failed', error_code: 'configuration_missing' };
    if (!to.length) return { status: 'failed', error_code: 'no_recipient' };
    const port = Number(process.env.SMTP_PORT || 587);
    const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST, port, secure: port === 465, requireTLS: port !== 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
        connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000,
    });
    try {
        const info = await transport.sendMail({
            from: { name: 'Restaurant Utsyn', address: process.env.SMTP_FROM || process.env.SMTP_USER! },
            to, subject, text, html,
        });
        return info.accepted.length ? { status: 'sent' } : { status: 'failed', error_code: 'invalid_recipient' };
    } catch (error) {
        const code = (error as { code?: string }).code || '';
        console.error('Email delivery failed', { code: code || 'unknown' });
        return { status: 'failed', error_code: CODES[code] || 'smtp_error' };
    } finally { transport.close(); }
}

// Plain, table-based markup so it renders the same in Outlook and Gmail.
export function layout(heading: string, intro: string, rows: [string, string][], footer: string): string {
    const body = rows.map(([k, v]) => `<tr><td style="padding:6px 16px 6px 0;color:#6b6b6b">${escapeHtml(k)}</td><td style="padding:6px 0;font-weight:600">${escapeHtml(v)}</td></tr>`).join('');
    return `<!doctype html><html><body style="margin:0;background:#f4f1ec;font-family:Arial,Helvetica,sans-serif;color:#222">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:8px;overflow:hidden">
<tr><td style="background:#1f3a4d;color:#fff;padding:20px 28px;font-size:20px;font-weight:700">Restaurant Utsyn</td></tr>
<tr><td style="padding:28px"><h1 style="margin:0 0 12px;font-size:20px">${escapeHtml(heading)}</h1>
<p style="margin:0 0 20px;line-height:1.5">${escapeHtml(intro)}</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:15px">${body}</table>
<p style="margin:24px 0 0;font-size:13px;color:#6b6b6b;line-height:1.5">${escapeHtml(footer)}</p></td></tr>
</table></td></tr></table></body></html>`;
}
