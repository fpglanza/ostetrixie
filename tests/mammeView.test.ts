import { describe, it, expect } from 'vitest';
import { descriviProssimo, filtraPerNome, rigaVicina } from '../src/lib/mammeView';
import type { Incontro } from '../src/lib/types';
import type { RigaMamma } from '../src/lib/overview';

const T = '2026-11-17';
const inc = (data: string, o: Partial<Incontro> = {}): Incontro => ({
  id: 'i', gravidanzaId: 'g', data, stato: 'programmato', tipo: 'controllo',
  partnerPresente: 'nd', createdAt: '', updatedAt: '', ...o,
});
const riga = (mammaId: string, o: Partial<RigaMamma> = {}): RigaMamma => ({
  mammaId, nome: mammaId, sezione: 'in_gravidanza', eg: null, egTotaleGiorni: null,
  fuoriRange: false, dpp: null, postParto: null, dataParto: null, prossimo: null,
  daRegistrare: [], upmMancante: false, ...o,
});

describe('descriviProssimo', () => {
  it('says "oggi" with the time for a meeting today', () => {
    expect(descriviProssimo(inc(T, { ora: '15:30' }), T)).toBe('Controllo oggi 15:30');
  });
  it('uses short weekday and dd.mm otherwise', () => {
    expect(descriviProssimo(inc('2026-11-20', { tipo: 'accompagnamento' }), T)).toBe('Accompagnamento ven 20.11');
    expect(descriviProssimo(inc('2026-11-26', { tipo: 'puerperio', ora: '09:00' }), T)).toBe('Puerperio gio 26.11 09:00');
    expect(descriviProssimo(inc('2026-11-30', { tipo: 'altro' }), T)).toBe('Incontro lun 30.11');
  });
});

describe('rigaVicina', () => {
  it('picks the in-gravidanza row nearest its DPP within 14 days', () => {
    const r = [
      riga('a', { dpp: '2026-11-23' }),
      riga('b', { dpp: '2026-11-20' }),
      riga('c', { dpp: '2026-11-20', sezione: 'dopo_parto' }),
    ];
    expect(rigaVicina(r, T)).toBe('b');
  });
  it('includes a DPP already passed, by distance', () => {
    expect(rigaVicina([riga('a', { dpp: '2026-11-15' }), riga('b', { dpp: '2026-11-21' })], T)).toBe('a');
  });
  it('ignores a DPP passed more than 14 days ago', () => {
    expect(rigaVicina([riga('a', { dpp: '2026-10-18' })], T)).toBeNull();
    expect(rigaVicina([riga('a', { dpp: '2026-11-03' })], T)).toBe('a');
  });
  it('returns null when nobody is within 14 days', () => {
    expect(rigaVicina([riga('a', { dpp: '2026-12-02' }), riga('b')], T)).toBeNull();
    expect(rigaVicina([riga('a', { dpp: '2026-12-01' })], T)).toBe('a');
  });
});

describe('filtraPerNome', () => {
  it('matches case- and accent-insensitively on any part of the name', () => {
    const r = [riga('1', { nome: 'Giulia Esposito' }), riga('2', { nome: 'Niccolò Rossi' })];
    expect(filtraPerNome(r, 'esp').map((x) => x.mammaId)).toEqual(['1']);
    expect(filtraPerNome(r, 'NICCOLO').map((x) => x.mammaId)).toEqual(['2']);
    expect(filtraPerNome(r, '  ')).toHaveLength(2);
  });
});
