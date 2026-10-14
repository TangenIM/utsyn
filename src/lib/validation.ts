export class InputError extends Error {
    status: number;
    constructor(message: string, status = 400) { super(message); this.status = status; }
}

export function text(value: unknown, label: string, min = 0, max = 500): string {
    if (typeof value !== 'string' || value.trim().length < min || value.length > max) {
        throw new InputError(`Invalid ${label}`);
    }
    return value.trim();
}

export function integer(value: unknown, label: string, min = 1, max = 2147483647): number {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) {
        throw new InputError(`Invalid ${label}`);
    }
    return value;
}

export function id(value: string): number {
    if (!/^[1-9]\d*$/.test(value)) throw new InputError('Invalid ID');
    return integer(Number(value), 'ID');
}

export function boolean(value: unknown, label: string): boolean {
    if (typeof value !== 'boolean') throw new InputError(`Invalid ${label}`);
    return value;
}

export function validDate(value: unknown): value is string {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
        Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

export function date(value: unknown): string {
    if (!validDate(value)) throw new InputError('Invalid date');
    return value;
}

export const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function timeSlots(value: unknown): string {
    const source = text(value, 'time slots', 0, 1000);
    if (!source) return '';
    const slots = source.split(',').map(s => s.trim());
    if (slots.some(s => !TIME.test(s))) throw new InputError('Time slots must use HH:MM');
    return [...new Set(slots)].sort().join(', ');
}

export function phone(value: unknown): string {
    const source = text(value, 'phone number', 8, 40).replace(/[\s()\-]/g, '');
    const normalized = source.startsWith('00') ? `+${source.slice(2)}` : /^\d{8}$/.test(source) ? `+47${source}` : source;
    if (!/^\+[1-9]\d{7,14}$/.test(normalized)) throw new InputError('Use an international phone number, for example +47 12345678');
    return normalized;
}

export function password(value: unknown): string {
    if (typeof value !== 'string' || value.length < 12 || Buffer.byteLength(value, 'utf8') > 72) {
        throw new InputError('Password must have at least 12 characters and at most 72 UTF-8 bytes');
    }
    return value;
}

export function apiError(error: unknown) {
    if (error instanceof InputError) return Response.json({ error: error.message }, { status: error.status });
    if (error instanceof SyntaxError) return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    const code = (error as { code?: string })?.code;
    if (code === '23505') return Response.json({ error: 'Already exists' }, { status: 409 });
    if (code === '23503') return Response.json({ error: 'Referenced record does not exist' }, { status: 400 });
    console.error('API request failed', { code: code || 'internal_error' });
    return Response.json({ error: 'Internal server error' }, { status: 500 });
}
