import test from 'node:test';
import assert from 'node:assert/strict';
import { generateTimeSlots, generateConfirmationCode, restaurantDate, validatePhone } from '../src/lib/utils.ts';
import { date, integer, phone, password, timeSlots } from '../src/lib/validation.ts';
import { clientIp } from '../src/lib/client-ip.ts';

test('proxy addresses require explicit trust and ignore client-added first hops', () => {
    const saved = process.env.TRUST_PROXY;
    try {
        delete process.env.TRUST_PROXY;
        const request = new Request('http://localhost', {headers:{'x-forwarded-for':'192.0.2.1, 192.0.2.2'}});
        assert.equal(clientIp(request),'unknown');
        process.env.TRUST_PROXY = 'true';
        assert.equal(clientIp(request),'192.0.2.2');
        assert.equal(clientIp(new Request('http://localhost',{headers:{'x-forwarded-for':'invalid'}})),'unknown');
        assert.equal(clientIp(new Request('http://localhost')),'unknown');
    } finally { if (saved === undefined) delete process.env.TRUST_PROXY; else process.env.TRUST_PROXY=saved; }
});

test('date, number and phone input rejects coercion and impossible values', () => {
    for (const value of ['2026-02-30', '2026-13-01', null, {}, 'not a date']) assert.throws(() => date(value));
    assert.equal(date('2028-02-29'), '2028-02-29');
    for (const value of ['4', 1.5, NaN, Infinity, null, false, -1]) assert.throws(() => integer(value, 'count'));
    assert.equal(phone('1234 5678'), '+4712345678');
    assert.equal(phone('00 380 50 123 4567'), '+380501234567');
    assert.equal(validatePhone('380501234567'),false);
    assert.equal(validatePhone('00 380 50 123 4567'),true);
    for (const value of ['00000000', '123', '+0123456789', {}, null]) assert.throws(() => phone(value));
    assert.throws(() => password('a'.repeat(73)));
    assert.throws(() => password('short'));
    assert.equal(password('  twelve-characters  '), '  twelve-characters  ');
});

test('restaurant dates follow Oslo across midnight and daylight saving', () => {
    assert.equal(restaurantDate(new Date('2026-10-14T22:01:00Z')),'2026-10-15');
    assert.equal(restaurantDate(new Date('2026-12-31T23:01:00Z')),'2027-01-01');
    assert.equal(restaurantDate(new Date('2026-03-29T01:30:00Z')),'2026-03-29');
});

test('time generation terminates on invalid settings and normalizes custom slots', () => {
    assert.deepEqual(generateTimeSlots('12:00', '14:00', 15, 45), ['12:00','12:15','12:30','12:45','13:00','13:15']);
    for (const interval of [0, -1, NaN, Infinity, 1.5]) assert.deepEqual(generateTimeSlots('12:00','14:00',interval), []);
    assert.deepEqual(generateTimeSlots('99:00','14:00'), []);
    assert.equal(timeSlots('18:00, 12:00, 18:00'), '12:00, 18:00');
    assert.throws(() => timeSlots('12:00,99:30'));
    assert.match(generateConfirmationCode(), /^[A-F0-9]{12}$/);
});
