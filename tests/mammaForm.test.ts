import { describe, expect, it } from 'vitest';
import { isDirty } from '../src/lib/incontroForm';
import { erroreData, erroriGravidanza, erroriMamma, formMamma } from '../src/lib/mammaForm';
import type { Gravidanza, Mamma } from '../src/lib/types';

const ts = '2026-01-01T00:00:00Z';
const mamma: Mamma = {
  id: 'm1', nome: 'Carmela', cognome: 'Rossi', telefono: '333', archiviata: false, createdAt: ts, updatedAt: ts,
};
const grav: Gravidanza = { id: 'g1', mammaId: 'm1', stato: 'in_corso', upm: '2026-03-20', createdAt: ts, updatedAt: ts };

describe('formMamma', () => {
  it('is all blank for a new mamma', () => {
    const f = formMamma();
    expect(Object.values(f).every((v) => v === '')).toBe(true);
    expect(Object.keys(f).sort()).toEqual(
      ['anamnesi', 'anamnesiOstetrica', 'cognome', 'dataNascita', 'dppEco', 'nome', 'note', 'telefono', 'upm'],
    );
  });
  it('fills from the stored mamma and pregnancy', () => {
    expect(formMamma(mamma, grav)).toMatchObject({ nome: 'Carmela', cognome: 'Rossi', telefono: '333', upm: '2026-03-20', dppEco: '' });
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
  it('erroriGravidanza checks UPM and DPP da eco', () => {
    expect(erroriGravidanza({ upm: '', dppEco: '' })).toEqual({});
    expect(erroriGravidanza({ upm: '275760-01-01', dppEco: '2027-01-10' })).toEqual({ upm: 'Inserisci una data valida.' });
  });
  it('erroriMamma requires the name and valid dates', () => {
    expect(erroriMamma({ ...formMamma(mamma, grav) })).toEqual({});
    expect(erroriMamma({ ...formMamma(), nome: ' ', dataNascita: '1990-13-01', dppEco: 'x' })).toEqual({
      nome: 'Il nome è obbligatorio.',
      dataNascita: 'Inserisci una data valida.',
      dppEco: 'Inserisci una data valida.',
    });
  });
});
