import { describe, it, expect } from 'vitest';
import {
  anteprimaGravidanza,
  gravidanzeScheda,
  prossimoIncontro,
  righeIncontri,
  testo,
} from '../src/lib/schedaView';
import type { Gravidanza, Incontro } from '../src/lib/types';

const T = '2026-11-17';
const inc = (id: string, data: string, o: Partial<Incontro> = {}): Incontro => ({
  id, gravidanzaId: 'g', data, stato: 'fatto', tipo: 'controllo',
  partnerPresente: 'nd', createdAt: '', updatedAt: '', ...o,
});
const grav = (id: string, o: Partial<Gravidanza> = {}): Gravidanza => ({
  id, mammaId: 'm', stato: 'in_corso', createdAt: id, updatedAt: id, ...o,
});

describe('anteprimaGravidanza', () => {
  it('computes DPP and today EG from UPM (Carmela on 17/11/2026)', () => {
    expect(anteprimaGravidanza({ upm: '2026-03-20' }, T)).toEqual({
      dpp: '2026-12-25', dppDaUpm: '2026-12-25', eg: '34+4', fuoriRange: false,
    });
  });
  it('uses the eco DPP when given and keeps the UPM one aside', () => {
    expect(anteprimaGravidanza({ upm: '2026-03-20', dppEco: '2026-12-30' }, T)).toEqual({
      dpp: '2026-12-30', dppDaUpm: '2026-12-25', eg: '33+6', fuoriRange: false,
    });
  });
  it('flags an out-of-range EG', () => {
    expect(anteprimaGravidanza({ upm: '2025-01-01' }, T)?.fuoriRange).toBe(true);
  });
  it('returns null with no dates and ignores half-typed values', () => {
    expect(anteprimaGravidanza({}, T)).toBeNull();
    expect(anteprimaGravidanza({ upm: '' }, T)).toBeNull();
    expect(anteprimaGravidanza({ upm: '0002-03-20' }, T)).toBeNull();
    expect(anteprimaGravidanza({ upm: '2026-02-31' }, T)).toBeNull();
  });
});

describe('gravidanzeScheda', () => {
  it('picks the newest in_corso as current, the rest as previous (newest first)', () => {
    const a = grav('2025-01', { stato: 'conclusa', dataParto: '2025-09-01' });
    const b = grav('2026-01');
    const c = grav('2026-02', { stato: 'conclusa', dataParto: '2026-03-01' });
    expect(gravidanzeScheda([c, b, a])).toEqual({ corrente: b, precedenti: [c, a] });
  });
  it('falls back to the newest when none is in_corso', () => {
    const a = grav('2025-01', { stato: 'conclusa' });
    const c = grav('2026-02', { stato: 'conclusa' });
    expect(gravidanzeScheda([a, c])).toEqual({ corrente: c, precedenti: [a] });
  });
  it('handles no pregnancies', () => {
    expect(gravidanzeScheda([])).toEqual({ corrente: null, precedenti: [] });
  });
});

describe('righeIncontri', () => {
  const g = grav('g', { upm: '2026-03-20' });

  it('numbers chronologically (oldest = 1) and lists newest first', () => {
    const r = righeIncontri(
      [inc('b', '2026-10-27'), inc('c', '2026-11-10'), inc('a', '2026-09-01')], g, T);
    expect(r.map((x) => [x.incontro.id, x.n])).toEqual([['c', 3], ['b', 2], ['a', 1]]);
  });
  it('orders same-day meetings by time, untimed last', () => {
    const r = righeIncontri(
      [inc('x', '2026-11-10'), inc('y', '2026-11-10', { ora: '15:00' }), inc('z', '2026-11-10', { ora: '09:00' })], g, T);
    expect(r.map((x) => [x.incontro.id, x.n])).toEqual([['x', 3], ['y', 2], ['z', 1]]);
  });
  it('shows EG at the meeting date, tipo, SF and partner', () => {
    const [r] = righeIncontri([inc('a', '2026-11-10', { sinfisiFondoCm: 33, partnerPresente: 'si' })], g, T);
    expect(r).toMatchObject({ epoca: '33+4', fuoriRange: false, tipo: 'Controllo', sf: 'SF 33 cm', partner: true, daRegistrare: false });
  });
  it('marks a past programmato as da registrare, a future one not', () => {
    const r = righeIncontri(
      [inc('old', '2026-11-16', { stato: 'programmato' }), inc('new', T, { stato: 'programmato', tipo: 'accompagnamento' })], g, T);
    expect(r.map((x) => [x.incontro.id, x.daRegistrare, x.programmato])).toEqual([['new', false, true], ['old', true, true]]);
    expect(r[0].tipo).toBe('Accompagnamento');
  });
  it('shows time since birth for meetings after the birth date', () => {
    const gp = grav('g', { upm: '2026-01-20', dataParto: '2026-10-27', stato: 'conclusa' });
    const r = righeIncontri([inc('a', '2026-11-01'), inc('b', '2026-10-27'), inc('c', '2026-11-24')], gp, T);
    expect(r.map((x) => x.epoca)).toEqual(['+4 sett', '+5 gg', '40+0']);
  });
  it('has no epoca without UPM', () => {
    const [r] = righeIncontri([inc('a', T)], grav('g'), T);
    expect(r.epoca).toBeNull();
    expect(r.sf).toBeNull();
    expect(r.partner).toBe(false);
  });
});

describe('prossimoIncontro', () => {
  it('is the earliest programmato from today on', () => {
    const list = [
      inc('past', '2026-11-10', { stato: 'programmato' }),
      inc('far', '2026-12-01', { stato: 'programmato' }),
      inc('near', '2026-11-20', { stato: 'programmato' }),
      inc('done', '2026-11-18'),
    ];
    expect(prossimoIncontro(list, T)?.id).toBe('near');
    expect(prossimoIncontro([], T)).toBeNull();
  });
});

describe('testo', () => {
  it('trims and turns blanks into undefined', () => {
    expect(testo('  Anna ')).toBe('Anna');
    expect(testo('   ')).toBeUndefined();
    expect(testo('')).toBeUndefined();
  });
});
