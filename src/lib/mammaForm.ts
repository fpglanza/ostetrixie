import { isValidISODate } from './dates';
import type { Gravidanza, Mamma } from './types';

/** The mamma form as typed (mamma fields + the current pregnancy's dates). */
export interface FormMamma {
  nome: string;
  cognome: string;
  telefono: string;
  dataNascita: string;
  anamnesi: string;
  note: string;
  upm: string;
  dppEco: string;
  anamnesiOstetrica: string;
}

export function formMamma(m?: Mamma, g?: Gravidanza | null): FormMamma {
  return {
    nome: m?.nome ?? '',
    cognome: m?.cognome ?? '',
    telefono: m?.telefono ?? '',
    dataNascita: m?.dataNascita ?? '',
    anamnesi: m?.anamnesi ?? '',
    note: m?.note ?? '',
    upm: g?.upm ?? '',
    dppEco: g?.dppEco ?? '',
    anamnesiOstetrica: g?.anamnesiOstetrica ?? '',
  };
}

const DATA_NON_VALIDA = 'Inserisci una data valida.';

/** Error for a date field: blank passes unless `obbligatoria`; anything else must be a real YYYY-MM-DD. */
export function erroreData(s: string, obbligatoria = false): string | undefined {
  const t = s.trim();
  if (!t) return obbligatoria ? DATA_NON_VALIDA : undefined;
  return isValidISODate(t) ? undefined : DATA_NON_VALIDA;
}

export type ErroriGravidanza = Partial<Record<'upm' | 'dppEco', string>>;

export function erroriGravidanza(g: { upm: string; dppEco: string }): ErroriGravidanza {
  const e: ErroriGravidanza = {};
  const upm = erroreData(g.upm);
  if (upm) e.upm = upm;
  const dppEco = erroreData(g.dppEco);
  if (dppEco) e.dppEco = dppEco;
  return e;
}

export type ErroriMamma = ErroriGravidanza & Partial<Record<'nome' | 'dataNascita', string>>;

export function erroriMamma(f: FormMamma): ErroriMamma {
  const e: ErroriMamma = {};
  if (!f.nome.trim()) e.nome = 'Il nome è obbligatorio.';
  const nascita = erroreData(f.dataNascita);
  if (nascita) e.dataNascita = nascita;
  return { ...e, ...erroriGravidanza(f) };
}
