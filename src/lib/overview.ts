import { diffDays, todayISO, type ISODate } from './dates';
import { dppEffettiva, egAt, formatEG, postPartumAt } from './obstetrics';
import type { Gravidanza, Incontro, Mamma } from './types';

export type Sezione = 'in_gravidanza' | 'dopo_parto' | 'archiviata';

export interface RigaMamma {
  mammaId: string;
  nome: string;
  sezione: Sezione;
  eg: string | null;
  egTotaleGiorni: number | null;
  fuoriRange: boolean;
  dpp: ISODate | null;
  postParto: string | null;
  dataParto: ISODate | null;
  prossimo: Incontro | null;
  daRegistrare: Incontro[];
  upmMancante: boolean;
}

export interface OverviewData {
  mamme: Mamma[];
  gravidanze: Gravidanza[];
  incontri: Incontro[];
}

const BACKUP_MAX_DAYS = 14;

function latestCreated(list: Gravidanza[]): Gravidanza | undefined {
  return list.reduce<Gravidanza | undefined>(
    (best, g) => (!best || g.createdAt > best.createdAt ? g : best),
    undefined,
  );
}

export function currentGravidanza(list: Gravidanza[]): Gravidanza | undefined {
  return latestCreated(list.filter((g) => g.stato === 'in_corso')) ?? latestCreated(list);
}

export function byDataOra(a: Incontro, b: Incontro): number {
  if (a.data !== b.data) return a.data < b.data ? -1 : 1;
  if (a.ora === b.ora) return 0;
  if (!a.ora) return 1;
  if (!b.ora) return -1;
  return a.ora < b.ora ? -1 : 1;
}

export function buildRighe(data: OverviewData, today: ISODate): RigaMamma[] {
  return data.mamme.map((m) => {
    const nome = m.nome + (m.cognome ? ' ' + m.cognome : '');
    const g = currentGravidanza(data.gravidanze.filter((x) => x.mammaId === m.id));
    if (!g) {
      return {
        mammaId: m.id, nome, sezione: m.archiviata ? 'archiviata' : 'in_gravidanza',
        eg: null, egTotaleGiorni: null, fuoriRange: false, dpp: null, postParto: null,
        dataParto: null, prossimo: null, daRegistrare: [], upmMancante: true,
      };
    }
    const sezione: Sezione = m.archiviata ? 'archiviata' : g.dataParto ? 'dopo_parto' : 'in_gravidanza';
    const eg = g.dataParto ? null : egAt(g, today);
    const programmati = data.incontri.filter((i) => i.gravidanzaId === g.id && i.stato === 'programmato');
    return {
      mammaId: m.id,
      nome,
      sezione,
      eg: eg ? formatEG(eg) : null,
      egTotaleGiorni: eg ? eg.totaleGiorni : null,
      fuoriRange: eg ? eg.fuoriRange : false,
      dpp: dppEffettiva(g),
      postParto: g.dataParto ? postPartumAt(g.dataParto, today) : null,
      dataParto: g.dataParto ?? null,
      prossimo: programmati.filter((i) => i.data >= today).sort(byDataOra)[0] ?? null,
      daRegistrare: programmati.filter((i) => i.data < today).sort(byDataOra),
      upmMancante: dppEffettiva(g) === null,
    };
  });
}

const byNome = (a: RigaMamma, b: RigaMamma) => a.nome.localeCompare(b.nome, 'it');

export function ordinaRighe(righe: RigaMamma[]): RigaMamma[] {
  const sec = (s: Sezione) => righe.filter((r) => r.sezione === s);
  const inGrav = sec('in_gravidanza').sort((a, b) => {
    if (a.dpp === b.dpp) return byNome(a, b);
    if (!a.dpp) return 1;
    if (!b.dpp) return -1;
    return a.dpp < b.dpp ? -1 : 1;
  });
  const dopo = sec('dopo_parto').sort((a, b) => {
    if (a.dataParto === b.dataParto) return byNome(a, b);
    return (a.dataParto ?? '') > (b.dataParto ?? '') ? -1 : 1;
  });
  return [...inGrav, ...dopo, ...sec('archiviata').sort(byNome)];
}

export function serveBackup(ultimoBackup: string | undefined, haDati: boolean, today: ISODate): boolean {
  if (!haDati) return false;
  if (!ultimoBackup) return true;
  return diffDays(todayISO(new Date(ultimoBackup)), today) > BACKUP_MAX_DAYS;
}
