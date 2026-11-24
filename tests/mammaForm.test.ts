import { describe, expect, it } from 'vitest';
import { isDirty } from '../src/lib/incontroForm';
import {
  aGravidanzaInput, campiEta, erroreData, erroriGravidanza, erroriMamma, etaAttuale, formMamma,
} from '../src/lib/mammaForm';
import type { Gravidanza, Mamma } from '../src/lib/types';

const ts = '2026-01-01T00:00:00Z';
const mamma: Mamma = {
  id: 'm1', nome: 'Carmela', cognome: 'Rossi', telefono: '333', archiviata: false, createdAt: ts, updatedAt: ts,
};
const grav: Gravidanza = { id: 'g1', mammaId: 'm1', stato: 'in_corso', upm: '2026-03-20', createdAt: ts, updatedAt: ts };

describe('formMamma', () => {
  it('is blank for a new mamma, eco no', () => {
    const { upmEco, ...resto } = formMamma();
    expect(upmEco).toBe('no');
    expect(Object.values(resto).every((v) => v === '')).toBe(true);
    expect(Object.keys(formMamma()).sort()).toEqual([
      'anamnesi', 'anamnesiOstetrica', 'cognome', 'eta', 'gravidanzaAttuale', 'nome', 'note',
      'partner', 'telefono', 'upm', 'upmEco',
    ]);
  });
  it('fills from the stored mamma and pregnancy', () => {
    const m = { ...mamma, eta: 32, etaAl: '2025-11-20', anamnesiOstetrica: 'Parto 2022' };
    expect(formMamma(m, { ...grav, upmEco: true, partner: 'Luca' }, '2026-11-24')).toMatchObject({
      nome: 'Carmela', cognome: 'Rossi', telefono: '333', eta: '33', anamnesiOstetrica: 'Parto 2022',
      upm: '2026-03-20', upmEco: 'si', partner: 'Luca',
    });
  });
  it('saves the pregnancy fields with blanks cleared', () => {
    expect(aGravidanzaInput({ ...formMamma(mamma, grav), upmEco: 'si', gravidanzaAttuale: ' Eco ok ' })).toEqual({
      upm: '2026-03-20', upmEco: true, gravidanzaAttuale: 'Eco ok', partner: undefined,
    });
  });
});

describe('isDirty on the mamma form', () => {
  it('is false when untouched or only blanks were added', () => {
    const base = formMamma(mamma, grav);
    expect(isDirty({ ...base }, base)).toBe(false);
    expect(isDirty({ ...base, nome: ' Carmela ', note: '  ' }, base)).toBe(false);
  });
  it('is true after typing in a new form or changing a date', () => {
    expect(isDirty({ ...formMamma(), nome: 'A' }, formMamma())).toBe(true);
    const base = formMamma(mamma, grav);
    expect(isDirty({ ...base, upm: '2026-03-21' }, base)).toBe(true);
  });
});

describe('date validation', () => {
  it('erroreData: blank is fine unless required, bad values are rejected', () => {
    expect(erroreData('')).toBeUndefined();
    expect(erroreData('', true)).toBe('Inserisci una data valida.');
    expect(erroreData('2026-03-20')).toBeUndefined();
    expect(erroreData('20266-03-20')).toBe('Inserisci una data valida.');
    expect(erroreData('2026-02-30')).toBe('Inserisci una data valida.');
  });
  it('erroriGravidanza checks the UPM', () => {
    expect(erroriGravidanza({ upm: '' })).toEqual({});
    expect(erroriGravidanza({ upm: '275760-01-01' })).toEqual({ upm: 'Inserisci una data valida.' });
  });
  it('erroriMamma requires the name and valid dates', () => {
    expect(erroriMamma({ ...formMamma(mamma, grav) })).toEqual({});
    expect(erroriMamma({ ...formMamma(), nome: ' ', eta: '3', upm: 'x' })).toEqual({
      nome: 'Il nome è obbligatorio.',
      eta: "Scrivi l'età in anni, es. 32.",
      upm: 'Inserisci una data valida.',
    });
  });
});

describe('età', () => {
  const T = '2026-11-17';
  it('grows the typed age by the years passed since it was typed', () => {
    expect(etaAttuale({ eta: 32, etaAl: T }, T)).toBe(32);
    expect(etaAttuale({ eta: 32, etaAl: '2025-11-18' }, T)).toBe(32);
    expect(etaAttuale({ eta: 32, etaAl: '2025-11-17' }, T)).toBe(33);
  });
  it('falls back to an old birth date, else null', () => {
    expect(etaAttuale({ dataNascita: '1990-11-18' }, T)).toBe(35);
    expect(etaAttuale({}, T)).toBeNull();
  });
  it('campiEta: untouched keeps what is stored, typed stores today, cleared clears', () => {
    expect(campiEta('33', '33', T)).toEqual({});
    expect(campiEta('34', '33', T)).toEqual({ eta: 34, etaAl: T, dataNascita: undefined });
    expect(campiEta('', '33', T)).toEqual({ eta: undefined, etaAl: undefined, dataNascita: undefined });
  });
});
