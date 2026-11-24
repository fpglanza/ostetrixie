import { isValidISODate, todayISO, type ISODate } from './dates';
import { testo as opz } from './schedaView';
import type { Gravidanza, Mamma } from './types';

/** The mamma form as typed (mamma fields + the current pregnancy's). */
export interface FormMamma {
  nome: string;
  cognome: string;
  telefono: string;
  eta: string;
  anamnesi: string;
  anamnesiOstetrica: string;
  note: string;
  upm: string;
  upmEco: 'si' | 'no';
  gravidanzaAttuale: string;
  partner: string;
}

export function formMamma(m?: Mamma, g?: Gravidanza | null, today: ISODate = todayISO()): FormMamma {
  const eta = m ? etaAttuale(m, today) : null;
  return {
    nome: m?.nome ?? '',
    cognome: m?.cognome ?? '',
    telefono: m?.telefono ?? '',
    eta: eta === null ? '' : String(eta),
    anamnesi: m?.anamnesi ?? '',
    anamnesiOstetrica: m?.anamnesiOstetrica ?? '',
    note: m?.note ?? '',
    ...formGravidanza(g),
  };
}

/** The pregnancy part of the form, also used by "Nuova gravidanza" (where it starts blank). */
export type FormGravidanza = Pick<FormMamma, 'upm' | 'upmEco' | 'gravidanzaAttuale' | 'partner'>;

export function formGravidanza(g?: Gravidanza | null): FormGravidanza {
  return {
    upm: g?.upm ?? '',
    upmEco: g?.upmEco ? 'si' : 'no',
    gravidanzaAttuale: g?.gravidanzaAttuale ?? '',
    partner: g?.partner ?? '',
  };
}

/** What the pregnancy fields save; blanks become undefined so they clear the stored value. */
export function aGravidanzaInput(f: FormGravidanza) {
  return {
    upm: opz(f.upm),
    upmEco: f.upmEco === 'si' ? true : undefined,
    gravidanzaAttuale: opz(f.gravidanzaAttuale),
    partner: opz(f.partner),
  };
}

/** Whole years from `da` to `a` (both YYYY-MM-DD). */
function anniTra(da: ISODate, a: ISODate): number {
  const [ay, am, ad] = da.split('-').map(Number);
  const [by, bm, bd] = a.split('-').map(Number);
  return by - ay - (bm < am || (bm === am && bd < ad) ? 1 : 0);
}

/** Today's age: the typed one grown by the years since it was typed, else from a stored birth date. */
export function etaAttuale(m: Pick<Mamma, 'eta' | 'etaAl' | 'dataNascita'>, today: ISODate): number | null {
  if (m.eta != null) return m.eta + (m.etaAl && m.etaAl <= today ? anniTra(m.etaAl, today) : 0);
  if (m.dataNascita && isValidISODate(m.dataNascita) && m.dataNascita <= today) return anniTra(m.dataNascita, today);
  return null;
}

/**
 * The age fields to save. An untouched age leaves what is stored alone (so it keeps growing);
 * a typed one is stored with today's date and replaces any old birth date; a cleared one clears both.
 */
export function campiEta(eta: string, etaCaricata: string, today: ISODate): Partial<Pick<Mamma, 'eta' | 'etaAl' | 'dataNascita'>> {
  if (eta.trim() === etaCaricata.trim()) return {};
  const n = eta.trim() ? Number(eta.trim()) : undefined;
  return { eta: n, etaAl: n === undefined ? undefined : today, dataNascita: undefined };
}

const DATA_NON_VALIDA = 'Inserisci una data valida.';

/** Error for a date field: blank passes unless `obbligatoria`; anything else must be a real YYYY-MM-DD. */
export function erroreData(s: string, obbligatoria = false): string | undefined {
  const t = s.trim();
  if (!t) return obbligatoria ? DATA_NON_VALIDA : undefined;
  return isValidISODate(t) ? undefined : DATA_NON_VALIDA;
}

/** Blank passes; otherwise whole years between 10 and 70. */
export function erroreEta(s: string): string | undefined {
  const t = s.trim();
  if (!t) return undefined;
  return /^\d{1,2}$/.test(t) && +t >= 10 && +t <= 70 ? undefined : "Scrivi l'età in anni, es. 32.";
}

export type ErroriGravidanza = Partial<Record<'upm', string>>;

export function erroriGravidanza(g: { upm: string }): ErroriGravidanza {
  const upm = erroreData(g.upm);
  return upm ? { upm } : {};
}

export type ErroriMamma = ErroriGravidanza & Partial<Record<'nome' | 'eta', string>>;

export function erroriMamma(f: FormMamma): ErroriMamma {
  const e: ErroriMamma = {};
  if (!f.nome.trim()) e.nome = 'Il nome è obbligatorio.';
  const eta = erroreEta(f.eta);
  if (eta) e.eta = eta;
  return { ...e, ...erroriGravidanza(f) };
}
