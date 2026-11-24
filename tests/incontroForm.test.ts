import { describe, expect, it } from 'vitest';
import {
  aIncontroInput,
  destinatariCopia,
  formDaIncontro,
  formNuovo,
  isDirty,
  lineaEpoca,
  parseNumero,
  statoDefault,
  tipoDefault,
} from '../src/lib/incontroForm';
import type { Gravidanza, Incontro, Mamma } from '../src/lib/types';

const T = '2026-11-17';
const grav = (o: Partial<Gravidanza> = {}): Gravidanza => ({
  id: 'g', mammaId: 'm', stato: 'in_corso', createdAt: 'a', updatedAt: 'a', ...o,
});
const carmela = grav({ upm: '2026-03-20' });

describe('defaults', () => {
  it('stato is programmato only for a future date', () => {
    expect(statoDefault('2026-11-18', T)).toBe('programmato');
    expect(statoDefault(T, T)).toBe('fatto');
    expect(statoDefault('2026-11-10', T)).toBe('fatto');
  });
  it('tipo is gravidanza before the birth, parto on the day, puerperio after', () => {
    expect(tipoDefault(carmela, T)).toBe('gravidanza');
    expect(tipoDefault(grav({ dataParto: '2026-11-17' }), T)).toBe('parto');
    expect(tipoDefault(grav({ dataParto: '2026-11-01' }), T)).toBe('puerperio');
    expect(tipoDefault(grav({ dataParto: '2026-11-20' }), T)).toBe('gravidanza');
  });
  it('formNuovo starts today, fatto, gravidanza, controllo, no pelvic floor, partner not stated', () => {
    expect(formNuovo(carmela, T)).toMatchObject({
      data: T, ora: '', stato: 'fatto', tipo: 'gravidanza', visita: 'controllo', partner: 'nd',
      pavimento: 'no', valutazionePavimento: '', sf: '', attivita: '',
    });
  });
  it('formNuovo marks the first meeting of a pregnancy', () => {
    expect(formNuovo(carmela, T, true).visita).toBe('primo');
  });
});

describe('parseNumero', () => {
  it('accepts comma and dot decimals', () => {
    expect(parseNumero('1,5')).toBe(1.5);
    expect(parseNumero(' 32.5 ')).toBe(32.5);
    expect(parseNumero('68')).toBe(68);
  });
  it('blank is undefined, garbage is null', () => {
    expect(parseNumero('')).toBeUndefined();
    expect(parseNumero('  ')).toBeUndefined();
    expect(parseNumero('abc')).toBeNull();
    expect(parseNumero('1,2,3')).toBeNull();
    expect(parseNumero('-3')).toBeNull();
  });
});

const record: Incontro = {
  id: 'i', gravidanzaId: 'g', data: '2026-11-10', ora: '10:30', stato: 'programmato',
  tipo: 'gravidanza', visita: 'primo', argomento: 'Allattamento', partnerPresente: 'si', attivita: 'Visita',
  pavimentoPelvico: true, valutazionePavimento: 'Tono buono', sinfisiFondoCm: 31.5, pesoKg: 68, pressione: '110/70', bcf: '140', note: 'ok',
  createdAt: 'a', updatedAt: 'a',
};

describe('record <-> form', () => {
  it('formDaIncontro shows decimals with a comma', () => {
    expect(formDaIncontro(record)).toEqual({
      data: '2026-11-10', ora: '10:30', stato: 'programmato', tipo: 'gravidanza', visita: 'primo',
      argomento: 'Allattamento', partner: 'si', attivita: 'Visita', pavimento: 'si',
      valutazionePavimento: 'Tono buono', sf: '31,5', peso: '68', pressione: '110/70', bcf: '140', note: 'ok',
    });
  });
  it('drops the pelvic floor notes when the evaluation is set back to no', () => {
    const r = aIncontroInput({ ...formDaIncontro(record), pavimento: 'no' }, 'g');
    expect(r.ok && [r.input.pavimentoPelvico, r.input.valutazionePavimento]).toEqual([undefined, undefined]);
  });
  it('round-trips into an IncontroInput', () => {
    const r = aIncontroInput(formDaIncontro(record), 'g');
    const { id, createdAt, updatedAt, ...attesi } = record;
    void id; void createdAt; void updatedAt;
    expect(r).toEqual({ ok: true, input: attesi });
  });
  it('drops blank text and parses "1,5"', () => {
    const f = { ...formNuovo(carmela, T), sf: '32,5', peso: ' ', argomento: '  ', ora: '' };
    const r = aIncontroInput(f, 'g');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.input.sinfisiFondoCm).toBe(32.5);
    expect(r.input.pesoKg).toBeUndefined();
    expect(r.input.argomento).toBeUndefined();
    expect(r.input.ora).toBeUndefined();
  });
  it('reports invalid numbers and dates per field', () => {
    const f = { ...formNuovo(carmela, T), data: '', sf: '3x', peso: 'abc' };
    const r = aIncontroInput(f, 'g');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.errori).sort()).toEqual(['data', 'peso', 'sf']);
  });
});

describe('isDirty', () => {
  it('is false for the untouched form and ignores surrounding blanks', () => {
    const base = formDaIncontro(record);
    expect(isDirty({ ...base }, base)).toBe(false);
    expect(isDirty({ ...base, note: 'ok  ' }, base)).toBe(false);
  });
  it('is true after any real change', () => {
    const base = formNuovo(carmela, T);
    expect(isDirty({ ...base, attivita: 'Visita' }, base)).toBe(true);
    expect(isDirty({ ...base, stato: 'programmato' }, base)).toBe(true);
    expect(isDirty({ ...base, sf: '32' }, base)).toBe(true);
  });
});

describe('lineaEpoca', () => {
  it('EG at the meeting date', () => {
    expect(lineaEpoca(carmela, T)).toEqual({ testo: '34+4 settimane', tono: 'ok' });
  });
  it('time since birth after the birth date', () => {
    const g = grav({ upm: '2026-01-20', dataParto: '2026-10-27' });
    expect(lineaEpoca(g, '2026-11-01')).toEqual({ testo: '+5 gg dal parto', tono: 'ok' });
    expect(lineaEpoca(g, '2026-11-26')).toEqual({ testo: '+4 sett dal parto', tono: 'ok' });
  });
  it('UPM mancante without dates', () => {
    expect(lineaEpoca(grav(), T)).toEqual({ testo: 'UPM mancante', tono: 'manca' });
  });
  it('flags dates outside the pregnancy', () => {
    expect(lineaEpoca(carmela, '2026-03-01')).toEqual({ testo: "Prima dell'UPM", tono: 'fuori' });
    expect(lineaEpoca(carmela, '2027-02-01')).toEqual({ testo: '45+3 settimane · fuori range', tono: 'fuori' });
  });
  it('null for an incomplete date', () => {
    expect(lineaEpoca(carmela, '')).toBeNull();
    expect(lineaEpoca(carmela, '0002-01-01x')).toBeNull();
  });
});

describe('destinatariCopia', () => {
  const m = (id: string, nome: string, archiviata = false): Mamma => ({
    id, nome, archiviata, createdAt: 'a', updatedAt: 'a',
  });
  const g = (id: string, mammaId: string, o: Partial<Gravidanza> = {}): Gravidanza => ({
    id, mammaId, stato: 'in_corso', createdAt: 'a', updatedAt: 'a', ...o,
  });
  it('lists the other pregnant mamme with their current pregnancy, nearest DPP first', () => {
    const data = {
      mamme: [m('a', 'Anna'), m('b', 'Bea'), m('c', 'Carla'), m('d', 'Dora', true), m('e', 'Eva')],
      gravidanze: [
        g('ga', 'a', { upm: '2026-03-20' }),
        g('gb', 'b', { upm: '2026-01-20', dataParto: '2026-10-27', stato: 'conclusa' }),
        g('gc', 'c', { upm: '2026-02-16' }),
        g('gd', 'd', { upm: '2026-04-01' }),
        g('ge', 'e', { upm: '2026-05-01' }),
      ],
      incontri: [],
    };
    expect(destinatariCopia(data, 'e', T)).toEqual([
      { mammaId: 'c', nome: 'Carla', gravidanzaId: 'gc' },
      { mammaId: 'a', nome: 'Anna', gravidanzaId: 'ga' },
    ]);
  });
});
