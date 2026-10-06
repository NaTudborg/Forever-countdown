import { describe, expect, it } from 'vitest';
import { countdownMessageText, countdownText, formatCountdown, parseTargetDateTime } from '../src/time.js';
describe('formatCountdown', () => {
    it('splits a duration into days, hours, minutes, and seconds', () => {
        expect(formatCountdown(((2 * 86_400) + (3 * 3_600) + (4 * 60) + 5) * 1_000)).toEqual({
            days: 2,
            hours: 3,
            minutes: 4,
            seconds: 5,
        });
    });
    it('clamps expired and fractional durations to zero', () => {
        expect(formatCountdown(-1)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        expect(countdownText(formatCountdown(61_999))).toBe('00 days  00 hours  01 minutes  01 seconds');
    });
    it('creates a text block for Discord message updates', () => {
        const text = countdownMessageText('Launch day', 3_661_000);
        expect(text).toContain('# 00 days  01 hours  01 minutes  01 seconds');
        expect(text.split('\n')).toHaveLength(2);
    });
});
describe('parseTargetDateTime', () => {
    it('converts a local time in an IANA timezone', () => {
        expect(parseTargetDateTime('2026-12-31 23:59:00', 'Europe/Copenhagen').toUTC().toISO()).toBe('2026-12-31T22:59:00.000Z');
    });
    it('rejects invalid timezones and dates', () => {
        expect(() => parseTargetDateTime('2026-12-31 23:59', 'Not/AZone')).toThrow('Unknown IANA timezone');
        expect(() => parseTargetDateTime('not a date', 'UTC')).toThrow('valid date and time');
    });
});
