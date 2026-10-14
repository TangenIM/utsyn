export function generateConfirmationCode(): string {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase();
}

export function restaurantDate(now = new Date()): string {
    return new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/Oslo',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}

export function generateTimeSlots(openTime: string, closeTime: string, intervalMinutes: number = 15, cutoffMinutes: number = 45): string[] {
    const slots: string[] = [];
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(openTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(closeTime) ||
        !Number.isInteger(intervalMinutes) || intervalMinutes < 1 || !Number.isInteger(cutoffMinutes) || cutoffMinutes < 0) return slots;
    const [openH, openM] = openTime.split(':').map(Number);
    const [closeH, closeM] = closeTime.split(':').map(Number);

    const openTotal = openH * 60 + openM;
    const closeTotal = closeH * 60 + closeM - cutoffMinutes;

    for (let t = openTotal; t <= closeTotal; t += intervalMinutes) {
        const h = Math.floor(t / 60).toString().padStart(2, '0');
        const m = (t % 60).toString().padStart(2, '0');
        slots.push(`${h}:${m}`);
    }
    return slots;
}

export function validatePhone(phone: string): boolean {
    const cleaned = phone.trim().replace(/[\s()\-]/g, '');
    const normalized = cleaned.startsWith('00') ? `+${cleaned.slice(2)}` : /^\d{8}$/.test(cleaned) ? `+47${cleaned}` : cleaned;
    return /^\+[1-9]\d{7,14}$/.test(normalized);
}

export function validateEmail(email: string): boolean {
    if (!email) return true; // email is optional
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
