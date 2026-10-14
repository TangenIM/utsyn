import type postgres from 'postgres';
import { generateTimeSlots } from './utils';
import { validDate, TIME } from './validation';

export function osloNow(now = new Date()) {
    const parts = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Oslo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
    const part = (name: string) => parts.find(p => p.type === name)?.value;
    return { date: `${part('year')}-${part('month')}-${part('day')}`, time: `${part('hour')}:${part('minute')}` };
}

export async function availability(sql: postgres.Sql | postgres.TransactionSql, date: string) {
    const now = osloNow();
    if (!validDate(date) || date < now.date) return { closed: true, slots: [], maxCapacity: 0 };
    const [closure] = await sql`SELECT * FROM special_closures WHERE date = ${date}`;
    if (closure?.is_closed) return { closed: true, slots: [], maxCapacity: 0 };
    const [day] = await sql`SELECT * FROM open_days WHERE day_of_week = ${new Date(date).getUTCDay()}`;
    if (!closure && !day?.is_active) return { closed: true, slots: [], maxCapacity: 0 };
    const rows = await sql`SELECT key, value FROM settings WHERE key IN ('booking_cutoff_minutes', 'time_slot_interval', 'max_capacity')`;
    const settings = Object.fromEntries(rows.map(row => [row.key, row.value]));
    const interval = Number(settings.time_slot_interval || 15);
    const cutoff = Number(settings.booking_cutoff_minutes || 45);
    const maxCapacity = Number(settings.max_capacity || 60);
    const custom = closure ? closure.time_slots : day?.time_slots;
    let times: string[] = custom?.trim() ? custom.split(',').map((s: string) => s.trim()).filter((s: string) => TIME.test(s)) :
        day?.is_active ? generateTimeSlots(day.open_time, day.close_time, interval, cutoff) : [];
    times = [...new Set(times)].sort().filter(time => date !== now.date || time > now.time);
    const reservations = await sql`SELECT time_slot, SUM(guests_count) AS total FROM reservations WHERE date = ${date} AND status IN ('needs_seat', 'confirmed', 'completed') GROUP BY time_slot`;
    const booked = Object.fromEntries(reservations.map(row => [row.time_slot, Number(row.total)]));
    return { closed: times.length === 0, openTime: day?.open_time, closeTime: day?.close_time, maxCapacity,
        slots: times.map(time => ({ time, booked: booked[time] || 0, available: Math.max(0, maxCapacity - (booked[time] || 0)), full: (booked[time] || 0) >= maxCapacity })) };
}
