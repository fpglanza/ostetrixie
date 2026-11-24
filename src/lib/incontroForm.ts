import { isValidISODate, type ISODate } from './dates';
import { egAt, formatEG, postPartumAt } from './obstetrics';
import { buildRighe, currentGravidanza, ordinaRighe, type OverviewData } from './overview';
import type { IncontroInput } from './repo';
import { numeroIT, testo } from './schedaView';
import type { Gravidanza, Incontro } from './types';

/** The incontro form as typed: every field is a string except the choices. */
export interface FormIncontro {
  data: string;
  ora: string;
  stato: Incontro['stato'];
  tipo: Incontro['tipo'];
  visita: NonNullable<Incontro['visita']>;
  argomento: string;
  partner: Incontro['partnerPresente'];
  attivita: string;
  pavimento: 'si' | 'no';
  valutazionePavimento: string;
  peso: string;
  pressione: string;
  sf: string;
  bcf: string;
  note: string;
}

export function statoDefault(data: ISODate, today: ISODate): Incontro['stato'] {
  return data > today ? 'programmato' : 'fatto';
}

/** Puerperio after the birth date, parto on the day itself, gravidanza before. */
export function tipoDefault(g: Pick<Gravidanza, 'dataParto'>, data: ISODate): Incontro['tipo'] {
  if (!g.dataParto || data < g.dataParto) return 'gravidanza';
  return data === g.dataParto ? 'parto' : 'puerperio';
}

/** `primo`: the pregnancy has no meetings yet, so this one starts as the first. */
export function formNuovo(g: Pick<Gravidanza, 'dataParto'>, today: ISODate, primo = false): FormIncontro {
  return {
    data: today,
    ora: '',
    stato: statoDefault(today, today),
    tipo: tipoDefault(g, today),
    visita: primo ? 'primo' : 'controllo',
    argomento: '',
    partner: 'nd',
    attivita: '',
    pavimento: 'no',
    valutazionePavimento: '',
    peso: '',
    pressione: '',
    sf: '',
    bcf: '',
    note: '',
  };
}

export function formDaIncontro(i: Incontro): FormIncontro {
  return {
    data: i.data,
    ora: i.ora ?? '',
    stato: i.stato,
    tipo: i.tipo,
    visita: i.visita ?? 'controllo',
    argomento: i.argomento ?? '',
    partner: i.partnerPresente,
    attivita: i.attivita ?? '',
    pavimento: i.pavimentoPelvico ? 'si' : 'no',
    valutazionePavimento: i.valutazionePavimento ?? '',
    peso: numeroIT(i.pesoKg),
    pressione: i.pressione ?? '',
    sf: numeroIT(i.sinfisiFondoCm),
    bcf: i.bcf ?? '',
    note: i.note ?? '',
  };
}

/** "1,5" and "1.5" → 1.5; blank → undefined; anything else → null. */
export function parseNumero(s: string): number | undefined | null {
  const t = s.trim();
  if (!t) return undefined;
  if (!/^\d+([.,]\d+)?$/.test(t)) return null;
  return Number(t.replace(',', '.'));
}

export type ErroriIncontro = Partial<Record<'data' | 'sf' | 'peso', string>>;

export function aIncontroInput(
  f: FormIncontro,
  gravidanzaId: string,
): { ok: true; input: IncontroInput } | { ok: false; errori: ErroriIncontro } {
  const errori: ErroriIncontro = {};
  if (!isValidISODate(f.data)) errori.data = 'Inserisci una data valida.';
  const sf = parseNumero(f.sf);
  if (sf === null) errori.sf = 'Scrivi un numero, es. 32 o 32,5.';
  const peso = parseNumero(f.peso);
  if (peso === null) errori.peso = 'Scrivi un numero, es. 68 o 68,5.';
  if (Object.keys(errori).length) return { ok: false, errori };
  return {
    ok: true,
    input: {
      gravidanzaId,
      data: f.data,
      ora: testo(f.ora),
      stato: f.stato,
      tipo: f.tipo,
      visita: f.visita,
      argomento: testo(f.argomento),
      partnerPresente: f.partner,
      attivita: testo(f.attivita),
      pavimentoPelvico: f.pavimento === 'si' ? true : undefined,
      valutazionePavimento: f.pavimento === 'si' ? testo(f.valutazionePavimento) : undefined,
      sinfisiFondoCm: sf ?? undefined,
      pesoKg: peso ?? undefined,
      pressione: testo(f.pressione),
      bcf: testo(f.bcf),
      note: testo(f.note),
    },
  };
}

/** Whether a form of text fields differs from what was loaded, ignoring surrounding whitespace. */
export function isDirty<F extends { [K in keyof F]: string }>(f: F, base: F): boolean {
  return (Object.keys(base) as (keyof F)[]).some((k) => f[k].trim() !== base[k].trim());
}

/** Live line under the date: EG at that date, time since birth, or what is missing. */
export function lineaEpoca(
  g: Pick<Gravidanza, 'upm' | 'dataParto'>,
  data: string,
): { testo: string; tono: 'ok' | 'fuori' | 'manca' } | null {
  if (!isValidISODate(data)) return null;
  if (g.dataParto && data > g.dataParto) {
    const pp = postPartumAt(g.dataParto, data)!;
    return { testo: `${pp.replace(/^parto /, '')} dal parto`, tono: 'ok' };
  }
  const eg = egAt(g, data);
  if (!eg) return { testo: 'UPM mancante', tono: 'manca' };
  if (eg.totaleGiorni < 0) return { testo: "Prima dell'UPM", tono: 'fuori' };
  const t = `${formatEG(eg)} settimane`;
  return eg.fuoriRange ? { testo: `${t} · fuori range`, tono: 'fuori' } : { testo: t, tono: 'ok' };
}

export interface Destinatario {
  mammaId: string;
  nome: string;
  gravidanzaId: string;
}

/** Other mamme in gravidanza, in list order, with the pregnancy a copy goes to. */
export function destinatariCopia(data: OverviewData, mammaId: string, today: ISODate): Destinatario[] {
  return ordinaRighe(buildRighe(data, today))
    .filter((r) => r.sezione === 'in_gravidanza' && r.mammaId !== mammaId)
    .flatMap((r) => {
      const g = currentGravidanza(data.gravidanze.filter((x) => x.mammaId === r.mammaId));
      return g ? [{ mammaId: r.mammaId, nome: r.nome, gravidanzaId: g.id }] : [];
    });
}
