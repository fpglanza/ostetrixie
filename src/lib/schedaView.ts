import { isValidISODate, type ISODate } from './dates';
import { TIPO } from './mammeView';
import { dppEffettiva, dppFromUpm, egAt, formatEG, postPartumAt } from './obstetrics';
import { byDataOra, currentGravidanza } from './overview';
import type { Gravidanza, Incontro } from './types';

export interface Anteprima {
  dpp: ISODate;
  dppDaUpm: ISODate | null;
  eg: string;
  fuoriRange: boolean;
}

const data = (s: string | undefined) => (s && isValidISODate(s) ? s : undefined);

/** Live DPP + today's EG for the pregnancy fields; null until a valid date is typed. */
export function anteprimaGravidanza(
  g: { upm?: string; dppEco?: string },
  today: ISODate,
): Anteprima | null {
  const upm = data(g.upm);
  const dppEco = data(g.dppEco);
  const dpp = dppEffettiva({ upm, dppEco });
  const eg = egAt({ upm, dppEco }, today);
  if (!dpp || !eg) return null;
  return { dpp, dppDaUpm: upm ? dppFromUpm(upm) : null, eg: formatEG(eg), fuoriRange: eg.fuoriRange };
}

/** The pregnancy the scheda is about, and the others newest first. */
export function gravidanzeScheda(list: Gravidanza[]): {
  corrente: Gravidanza | null;
  precedenti: Gravidanza[];
} {
  const corrente = currentGravidanza(list) ?? null;
  const precedenti = list
    .filter((g) => g !== corrente)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { corrente, precedenti };
}

export interface RigaIncontro {
  incontro: Incontro;
  /** Progressive number within the pregnancy, oldest = 1. */
  n: number;
  /** EG at the meeting date, or time since birth ("+5 gg") after it. */
  epoca: string | null;
  fuoriRange: boolean;
  tipo: string;
  sf: string | null;
  partner: boolean;
  programmato: boolean;
  daRegistrare: boolean;
}

const cronologico = (a: Incontro, b: Incontro) =>
  byDataOra(a, b) || a.createdAt.localeCompare(b.createdAt);

/** Timetable rows for one pregnancy's meetings, newest first. */
export function righeIncontri(incontri: Incontro[], g: Gravidanza, today: ISODate): RigaIncontro[] {
  return [...incontri]
    .sort(cronologico)
    .map((i, k): RigaIncontro => {
      const dopoParto = !!g.dataParto && i.data > g.dataParto;
      const eg = dopoParto ? null : egAt(g, i.data);
      const pp = dopoParto ? postPartumAt(g.dataParto!, i.data) : null;
      return {
        incontro: i,
        n: k + 1,
        epoca: pp ? pp.replace(/^parto /, '') : eg ? formatEG(eg) : null,
        fuoriRange: eg?.fuoriRange ?? false,
        tipo: TIPO[i.tipo],
        sf: i.sinfisiFondoCm != null ? `SF ${numeroIT(i.sinfisiFondoCm)} cm` : null,
        partner: i.partnerPresente === 'si',
        programmato: i.stato === 'programmato',
        daRegistrare: i.stato === 'programmato' && i.data < today,
      };
    })
    .reverse();
}

/** Earliest planned meeting from today on. */
export function prossimoIncontro(incontri: Incontro[], today: ISODate): Incontro | null {
  return (
    incontri.filter((i) => i.stato === 'programmato' && i.data >= today).sort(cronologico)[0] ??
    null
  );
}

/** 33.5 → "33,5" (Italian decimal comma); undefined → "". */
export function numeroIT(n: number | undefined): string {
  return n == null ? '' : String(n).replace('.', ',');
}

/** Trimmed form text, or undefined when blank. */
export function testo(s: string): string | undefined {
  const t = s.trim();
  return t ? t : undefined;
}
