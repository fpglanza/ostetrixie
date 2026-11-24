import { describe, it, expect } from 'vitest';
import { eventiPerGiorno, monthGrid, prossimi7, righePerIncontro } from '../src/lib/calendar';
import type { Gravidanza, Incontro, Mamma } from '../src/lib/types';

const T = '2026-11-17';
const ts = '2026-01-01T00:00:00Z';
const mamma = (id: string, nome: string, o: Partial<Mamma> = {}): Mamma =>
  ({ id, nome, archiviata: false, createdAt: ts, updatedAt: ts, ...o });
const grav = (id: string, mammaId: string, o: Partial<Gravidanza> = {}): Gravidanza =>
  ({ id, mammaId, stato: 'in_corso', createdAt: ts, updatedAt: ts, ...o });
const inc = (id: string, gravidanzaId: string, data: string, o: Partial<Incontro> = {}): Incontro =>
  ({ id, gravidanzaId, data, stato: 'programmato', tipo: 'gravidanza', partnerPresente: 'nd', createdAt: ts, updatedAt: ts, ...o });

const data = {
  mamme: [
    mamma('m1', 'Carmela', { cognome: 'Rossi' }),
    mamma('m2', 'Anna', { cognome: 'Verdi' }),
    mamma('m3', 'Archiviata', { archiviata: true }),
  ],
  gravidanze: [
    grav('g1', 'm1', { upm: '2026-03-20' }),
    grav('g2', 'm2', { upm: '2026-03-21', stato: 'conclusa', dataParto: '2026-11-10' }),
    grav('g3', 'm3', { upm: '2026-03-20' }),
  ],
  incontri: [
    inc('a', 'g1', '2026-11-23', { ora: '15:00' }),
    inc('b', 'g1', '2026-11-25'),
    inc('c', 'g2', '2026-11-17', { stato: 'fatto' }),
    inc('d', 'g1', '2026-11-17', { ora: '09:30' }),
    inc('e', 'g3', '2026-11-18'),
  ],
};

describe('monthGrid', () => {
  it('starts on Monday and covers 6 full weeks', () => {
    const g = monthGrid(2026, 11);
    expect(g[0][0]).toBe('2026-10-26');
    expect(g).toHaveLength(6);
    expect(g.flat()).toHaveLength(42);
    expect(g.every((w) => w.length === 7)).toBe(true);
    expect(g[5][6]).toBe('2026-12-06');
  });

  it('starts on the 1st when the month begins on Monday', () => {
    expect(monthGrid(2026, 6)[0][0]).toBe('2026-06-01');
  });
});

describe('eventiPerGiorno', () => {
  const ev = eventiPerGiorno(data, '2026-10-26', '2027-01-31');

  it('puts the DPP of an in_corso gravidanza on its day', () => {
    expect(ev['2026-12-25']).toEqual([{ tipo: 'dpp', data: '2026-12-25', mammaId: 'm1', nome: 'Carmela Rossi' }]);
  });

  it('skips the DPP of a concluded gravidanza', () => {
    expect(ev['2026-12-26']).toBeUndefined();
  });

  it('lists programmati and fatti, sorted by ora, missing ora last', () => {
    expect(ev['2026-11-17'].map((e) => e.incontro!.id)).toEqual(['d', 'c']);
    expect(ev['2026-11-17'][1]).toMatchObject({ tipo: 'incontro', mammaId: 'm2', nome: 'Anna Verdi' });
  });

  it('skips archived mamme entirely', () => {
    expect(ev['2026-11-18']).toBeUndefined();
    expect(Object.values(ev).flat().some((e) => e.mammaId === 'm3')).toBe(false);
  });

  it('only includes days inside the range', () => {
    expect(Object.keys(eventiPerGiorno(data, '2026-11-18', '2026-11-24'))).toEqual(['2026-11-23']);
  });
});

describe('prossimi7', () => {
  it('covers today..today+6, sorted by date then ora', () => {
    const ids = prossimi7(data, T).map((e) => e.incontro?.id);
    expect(ids).toEqual(['d', 'c', 'a']);
    expect(ids).not.toContain('b');
  });
});

describe('righePerIncontro', () => {
  it('flags past programmati of non-archived mamme as da registrare', () => {
    const r = righePerIncontro(
      { ...data, incontri: [...data.incontri, inc('old', 'g1', '2026-11-10')] }, T,
    );
    expect(r.get('old')).toMatchObject({ daRegistrare: true, epoca: '33+4' });
    expect(r.get('a')).toMatchObject({ daRegistrare: false, programmato: true });
    expect(r.has('e')).toBe(false);
  });
});
