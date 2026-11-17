import { describe, it, expect } from 'vitest';
import { addDays, diffDays, formatIT, formatShort, isValidISODate, todayISO, weekdayIT } from '../src/lib/dates';

describe('dates', () => {
  it('diffDays is DST-safe', () => {
    expect(diffDays('2026-10-24', '2026-10-26')).toBe(2);
    expect(diffDays('2026-03-28', '2026-03-30')).toBe(2);
    expect(diffDays('2026-03-20', '2026-11-17')).toBe(242);
    expect(diffDays('2026-11-17', '2026-11-10')).toBe(-7);
  });
  it('addDays crosses month, year and leap day', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('todayISO uses the local calendar date', () => {
    expect(todayISO(new Date(2026, 10, 17, 23, 59))).toBe('2026-11-17');
    expect(todayISO(new Date(2026, 10, 18, 0, 1))).toBe('2026-11-18');
  });
  it('formats', () => {
    expect(formatIT('2026-11-07')).toBe('07/11/2026');
    expect(formatShort('2026-11-07')).toBe('07.11');
  });
  it('validates', () => {
    expect(isValidISODate('2026-02-28')).toBe(true);
    expect(isValidISODate('2026-02-30')).toBe(false);
    expect(isValidISODate('2026-2-3')).toBe(false);
    expect(isValidISODate('')).toBe(false);
  });
});

describe('weekdayIT', () => {
  it('names the weekday of a date in Italian, full or short', () => {
    expect(weekdayIT('2026-11-17')).toBe('martedì');
    expect(weekdayIT('2026-11-20', true)).toBe('ven');
    expect(weekdayIT('2026-11-30', true)).toBe('lun');
    expect(weekdayIT('2026-11-22')).toBe('domenica');
  });
});
