import { describe, expect, it } from 'vitest';
import { normalizzaGravidanza, normalizzaIncontro } from '../src/lib/migrazioni';

describe('normalizzaGravidanza', () => {
  it('turns a DPP da eco into a corrected UPM marked eco', () => {
    expect(normalizzaGravidanza({ id: 'g', upm: '2026-03-20', dppEco: '2026-12-30' })).toEqual({
      id: 'g', upm: '2026-03-25', upmEco: true,
    });
  });
  it('moves the per-pregnancy anamnesi ostetrica into gravidanza attuale', () => {
    expect(normalizzaGravidanza({ id: 'g', anamnesiOstetrica: 'Eco 12 sett ok' })).toEqual({
      id: 'g', gravidanzaAttuale: 'Eco 12 sett ok',
    });
  });
  it('leaves a UPM-only pregnancy alone', () => {
    const g = { id: 'g', upm: '2026-03-20' };
    expect(normalizzaGravidanza(g)).toBe(g);
  });
});

describe('normalizzaIncontro', () => {
  const i = (tipo: string, o: Record<string, unknown> = {}): Record<string, unknown> => ({ id: 'i', data: '2026-11-10', tipo, ...o });
  it('controllo becomes gravidanza, visita controllo', () => {
    expect(normalizzaIncontro(i('controllo'))).toMatchObject({ tipo: 'gravidanza', visita: 'controllo' });
  });
  it('accompagnamento keeps its name in argomento unless one is set', () => {
    expect(normalizzaIncontro(i('accompagnamento'))).toMatchObject({ tipo: 'gravidanza', argomento: 'Accompagnamento alla nascita' });
    expect(normalizzaIncontro(i('accompagnamento', { argomento: 'Travaglio' })).argomento).toBe('Travaglio');
  });
  it('an old tipo after the birth date becomes puerperio', () => {
    expect(normalizzaIncontro(i('altro'), '2026-11-01').tipo).toBe('puerperio');
    expect(normalizzaIncontro(i('altro'), '2026-11-20').tipo).toBe('gravidanza');
  });
  it('leaves new tipi alone', () => {
    const x = i('puerperio');
    expect(normalizzaIncontro(x)).toBe(x);
  });
});
