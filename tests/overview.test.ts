import { describe, it, expect } from 'vitest';
import { buildRighe, ordinaRighe, serveBackup } from '../src/lib/overview';
import type { Gravidanza, Incontro, Mamma } from '../src/lib/types';

const T = '2026-11-17';
const ts = '2026-01-01T00:00:00Z';
const mamma = (id: string, nome: string, o: Partial<Mamma> = {}): Mamma =>
  ({ id, nome, archiviata: false, createdAt: ts, updatedAt: ts, ...o });
const grav = (id: string, mammaId: string, o: Partial<Gravidanza> = {}): Gravidanza =>
  ({ id, mammaId, stato: 'in_corso', createdAt: ts, updatedAt: ts, ...o });
const inc = (id: string, gravidanzaId: string, data: string, o: Partial<Incontro> = {}): Incontro =>
  ({ id, gravidanzaId, data, stato: 'programmato', tipo: 'gravidanza', partnerPresente: 'nd', createdAt: ts, updatedAt: ts, ...o });

describe('buildRighe', () => {
  it('derives EG and DPP from UPM and joins the name', () => {
    const [r] = buildRighe({
      mamme: [mamma('m1', 'Carmela', { cognome: 'Rossi' })],
      gravidanze: [grav('g1', 'm1', { upm: '2026-03-20' })], incontri: [],
    }, T);
    expect(r).toMatchObject({ nome: 'Carmela Rossi', sezione: 'in_gravidanza', eg: '34+4', dpp: '2026-12-25', upmMancante: false, fuoriRange: false });
  });

  it('flags missing UPM and sorts it after others', () => {
    const righe = buildRighe({
      mamme: [mamma('m2', 'Senza'), mamma('m1', 'Pina')],
      gravidanze: [grav('g2', 'm2'), grav('g1', 'm1', { upm: '2026-03-20' })], incontri: [],
    }, T);
    const senza = righe.find((r) => r.mammaId === 'm2')!;
    expect(senza).toMatchObject({ upmMancante: true, eg: null, dpp: null });
    expect(ordinaRighe(righe).map((r) => r.nome)).toEqual(['Pina', 'Senza']);
  });

  it('splits past programmati into daRegistrare, future into prossimo', () => {
    const data = {
      mamme: [mamma('m1', 'A')], gravidanze: [grav('g1', 'm1', { upm: '2026-03-20' })],
      incontri: [inc('i1', 'g1', '2026-11-10'), inc('i2', 'g1', '2026-11-20'), inc('i3', 'g1', '2026-11-18')],
    };
    const [r] = buildRighe(data, T);
    expect(r.daRegistrare.map((i) => i.id)).toEqual(['i1']);
    expect(r.prossimo!.id).toBe('i3');
    const [r2] = buildRighe({ ...data, incontri: [{ ...data.incontri[0], stato: 'fatto' }, ...data.incontri.slice(1)] }, T);
    expect(r2.daRegistrare).toEqual([]);
  });

  it('treats today as prossimo and breaks ties by ora, missing ora last', () => {
    const base = { mamme: [mamma('m1', 'A')], gravidanze: [grav('g1', 'm1')] };
    const [r] = buildRighe({ ...base, incontri: [inc('a', 'g1', T), inc('b', 'g1', T, { ora: '15:00' }), inc('c', 'g1', T, { ora: '09:00' })] }, T);
    expect(r.prossimo!.id).toBe('c');
    const [r2] = buildRighe({ ...base, incontri: [inc('a', 'g1', T), inc('b', 'g1', T, { ora: '15:00' })] }, T);
    expect(r2.prossimo!.id).toBe('b');
  });

  it('ignores incontri of other gravidanze', () => {
    const [r] = buildRighe({
      mamme: [mamma('m1', 'A')],
      gravidanze: [grav('g1', 'm1', { stato: 'conclusa', createdAt: '2025-01-01T00:00:00Z' }), grav('g2', 'm1', { createdAt: '2026-01-01T00:00:00Z' })],
      incontri: [inc('old', 'g1', '2026-11-10'), inc('new', 'g2', '2026-11-25')],
    }, T);
    expect(r.daRegistrare).toEqual([]);
    expect(r.prossimo!.id).toBe('new');
  });

  it('picks in_corso, else most recently created', () => {
    const mk = (gs: Gravidanza[]) => buildRighe({ mamme: [mamma('m1', 'A')], gravidanze: gs, incontri: [] }, T)[0];
    expect(mk([
      grav('old', 'm1', { upm: '2026-01-01', createdAt: '2026-01-15T00:00:00Z' }),
      grav('cur', 'm1', { upm: '2026-03-20', createdAt: '2026-02-01T00:00:00Z' }),
      grav('done', 'm1', { upm: '2025-01-01', stato: 'conclusa', createdAt: '2026-09-01T00:00:00Z' }),
    ]).dpp).toBe('2026-12-25');
    expect(mk([
      grav('a', 'm1', { upm: '2025-01-01', stato: 'conclusa', createdAt: '2025-02-01T00:00:00Z' }),
      grav('b', 'm1', { upm: '2026-03-20', stato: 'conclusa', createdAt: '2026-02-01T00:00:00Z' }),
    ]).dpp).toBe('2026-12-25');
  });

  it('puts a gravidanza with dataParto in dopo_parto', () => {
    const [r] = buildRighe({
      mamme: [mamma('m1', 'A')],
      gravidanze: [grav('g1', 'm1', { upm: '2026-01-20', dataParto: '2026-10-27', stato: 'conclusa' })], incontri: [],
    }, T);
    expect(r).toMatchObject({ sezione: 'dopo_parto', postParto: 'parto +3 sett', dataParto: '2026-10-27', eg: null });
  });

  it('archived flag wins; mamma without gravidanza handled', () => {
    const righe = buildRighe({
      mamme: [mamma('m1', 'A', { archiviata: true }), mamma('m2', 'B'), mamma('m3', 'C', { archiviata: true })],
      gravidanze: [grav('g1', 'm1', { upm: '2026-03-20' })], incontri: [],
    }, T);
    expect(righe.map((r) => r.sezione)).toEqual(['archiviata', 'in_gravidanza', 'archiviata']);
    expect(righe[1]).toMatchObject({ upmMancante: true, eg: null, prossimo: null, daRegistrare: [] });
  });
});

describe('ordinaRighe', () => {
  it('orders sections: DPP asc (missing last), parto desc, archived by name', () => {
    const righe = buildRighe({
      mamme: [
        mamma('a', 'Zeta'), mamma('b', 'Beta'), mamma('c', 'Nodpp'),
        mamma('d', 'P1'), mamma('e', 'P2'), mamma('f', 'Zoe', { archiviata: true }), mamma('g', 'Anna', { archiviata: true }),
      ],
      gravidanze: [
        grav('ga', 'a', { upm: '2026-03-20' }), grav('gb', 'b', { upm: '2026-05-01' }), grav('gc', 'c'),
        grav('gd', 'd', { dataParto: '2026-10-01' }), grav('ge', 'e', { dataParto: '2026-11-01' }),
      ], incontri: [],
    }, T);
    expect(ordinaRighe(righe).map((r) => r.nome)).toEqual(['Zeta', 'Beta', 'Nodpp', 'P2', 'P1', 'Anna', 'Zoe']);
  });
});

describe('serveBackup', () => {
  it('never backed up', () => {
    expect(serveBackup(undefined, true, T)).toBe(true);
    expect(serveBackup(undefined, false, T)).toBe(false);
  });
  it('threshold at more than 14 days', () => {
    expect(serveBackup('2026-11-03T10:00:00Z', true, T)).toBe(false);
    expect(serveBackup('2026-11-02T10:00:00Z', true, T)).toBe(true);
    expect(serveBackup('2026-11-02T10:00:00Z', false, T)).toBe(false);
  });
});
