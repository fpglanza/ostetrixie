import { addDays, isoWeekday, type ISODate } from './dates';
import { dppEffettiva } from './obstetrics';
import { byDataOra, type OverviewData } from './overview';
import { righeIncontri, type RigaIncontro } from './schedaView';
import type { Incontro } from './types';

export interface Evento {
  tipo: 'incontro' | 'dpp';
  /** Day of the event (the meeting date or the DPP). */
  data: ISODate;
  mammaId: string;
  nome: string;
  incontro?: Incontro;
}

export const MESI = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
];

const pad = (n: number) => String(n).padStart(2, '0');

/** Six Monday-first weeks covering the month, with leading/trailing days. */
export function monthGrid(year: number, month1to12: number): ISODate[][] {
  const primo = `${String(year).padStart(4, '0')}-${pad(month1to12)}-01`;
  const inizio = addDays(primo, 1 - isoWeekday(primo));
  return Array.from({ length: 6 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDays(inizio, w * 7 + d)),
  );
}

const nomeDi = (m: { nome: string; cognome?: string }) => m.nome + (m.cognome ? ' ' + m.cognome : '');

function perOra(a: Evento, b: Evento): number {
  if (a.incontro && b.incontro) return byDataOra(a.incontro, b.incontro) || a.nome.localeCompare(b.nome, 'it');
  if (a.incontro) return -1; // DPP has no time: after timed and untimed meetings
  if (b.incontro) return 1;
  return a.nome.localeCompare(b.nome, 'it');
}

/** Meetings (programmati and fatti) and DPPs of in_corso gravidanze per day, archived mamme excluded. */
export function eventiPerGiorno(data: OverviewData, from: ISODate, to: ISODate): Record<ISODate, Evento[]> {
  const attive = new Map(data.mamme.filter((m) => !m.archiviata).map((m) => [m.id, m]));
  const gravidanze = new Map(data.gravidanze.filter((g) => attive.has(g.mammaId)).map((g) => [g.id, g]));
  const out: Record<ISODate, Evento[]> = {};
  const metti = (e: Evento) => {
    if (e.data < from || e.data > to) return;
    (out[e.data] ??= []).push(e);
  };
  for (const g of gravidanze.values()) {
    const dpp = g.stato === 'in_corso' ? dppEffettiva(g) : null;
    if (dpp) metti({ tipo: 'dpp', data: dpp, mammaId: g.mammaId, nome: nomeDi(attive.get(g.mammaId)!) });
  }
  for (const i of data.incontri) {
    const g = gravidanze.get(i.gravidanzaId);
    if (g) metti({ tipo: 'incontro', data: i.data, mammaId: g.mammaId, nome: nomeDi(attive.get(g.mammaId)!), incontro: i });
  }
  for (const giorno of Object.keys(out)) out[giorno].sort(perOra);
  return out;
}

/** Events from today to today+6 inclusive, by date then ora. */
export function prossimi7(data: OverviewData, today: ISODate): Evento[] {
  const ev = eventiPerGiorno(data, today, addDays(today, 6));
  return Object.keys(ev).sort().flatMap((d) => ev[d]);
}

/** Timetable row (epoca, da registrare…) of every meeting of non-archived mamme, by incontro id. */
export function righePerIncontro(data: OverviewData, today: ISODate): Map<string, RigaIncontro> {
  const attive = new Set(data.mamme.filter((m) => !m.archiviata).map((m) => m.id));
  const out = new Map<string, RigaIncontro>();
  for (const g of data.gravidanze) {
    if (!attive.has(g.mammaId)) continue;
    const lista = data.incontri.filter((i) => i.gravidanzaId === g.id);
    for (const r of righeIncontri(lista, g, today)) out.set(r.incontro.id, r);
  }
  return out;
}
