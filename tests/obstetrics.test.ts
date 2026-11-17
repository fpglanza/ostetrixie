import { describe, it, expect } from 'vitest';
import {
  dppFromUpm, dppEffettiva, egAt, formatEG, postPartumAt, stationPosition, STAZIONI_SETTIMANE,
} from '../src/lib/obstetrics';
import { addDays } from '../src/lib/dates';

describe('dppFromUpm', () => {
  it('adds 280 days', () => {
    expect(dppFromUpm('2026-03-20')).toBe('2026-12-25');
    expect(dppFromUpm('2026-02-16')).toBe('2026-11-23');
    expect(dppFromUpm('2027-06-01')).toBe('2028-03-07');
    expect(dppFromUpm('2026-03-27')).toBe('2027-01-01');
  });
});

describe('egAt', () => {
  it('computes from UPM', () => {
    const eg = egAt({ upm: '2026-03-20' }, '2026-11-17');
    expect(eg).toEqual({ settimane: 34, giorni: 4, totaleGiorni: 242, fuoriRange: false });
    expect(formatEG(eg!)).toBe('34+4');
  });
  it('uses eco DPP when present', () => {
    expect(egAt({ upm: '2026-03-20', dppEco: '2026-12-30' }, '2026-11-17')!.totaleGiorni).toBe(237);
    expect(dppEffettiva({ upm: '2026-03-20', dppEco: '2026-12-30' })).toBe('2026-12-30');
  });
  it('flags out of range', () => {
    const upm = '2026-03-20';
    expect(egAt({ upm }, addDays(upm, 309))).toMatchObject({ totaleGiorni: 309, fuoriRange: true });
    expect(egAt({ upm }, addDays(upm, 308))!.fuoriRange).toBe(false);
    const before = egAt({ upm }, addDays(upm, -3))!;
    expect(before.totaleGiorni).toBe(-3);
    expect(before.fuoriRange).toBe(true);
  });
  it('handles missing UPM', () => {
    expect(egAt({}, '2026-11-17')).toBeNull();
    expect(dppEffettiva({})).toBeNull();
    expect(dppEffettiva({ dppEco: '2027-01-10' })).toBe('2027-01-10');
    expect(egAt({ dppEco: '2027-01-10' }, '2026-11-17')).not.toBeNull();
  });
  it('dppEffettiva falls back to UPM-derived DPP', () => {
    expect(dppEffettiva({ upm: '2026-03-20' })).toBe('2026-12-25');
  });
});

describe('postPartumAt', () => {
  it('formats days and weeks', () => {
    expect(postPartumAt('2026-10-27', '2026-11-01')).toBe('parto +5 gg');
    expect(postPartumAt('2026-10-27', '2026-11-10')).toBe('parto +14 gg');
    expect(postPartumAt('2026-10-27', '2026-11-17')).toBe('parto +3 sett');
    expect(postPartumAt('2026-10-27', '2026-10-27')).toBe('parto +0 gg');
    expect(postPartumAt('2026-10-27', '2026-10-26')).toBeNull();
  });
});

describe('stationPosition', () => {
  it('is a clamped fraction of 280 days', () => {
    expect(stationPosition(140)).toBe(0.5);
    expect(stationPosition(300)).toBe(1);
    expect(stationPosition(-3)).toBe(0);
    expect(STAZIONI_SETTIMANE).toEqual([13, 27, 37, 40]);
  });
});
