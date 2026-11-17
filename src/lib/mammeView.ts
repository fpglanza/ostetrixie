import { diffDays, formatShort, weekdayIT, type ISODate } from './dates';
import type { RigaMamma } from './overview';
import type { Incontro } from './types';

const TIPO: Record<Incontro['tipo'], string> = {
  controllo: 'Controllo',
  accompagnamento: 'Accompagnamento',
  puerperio: 'Puerperio',
  altro: 'Incontro',
};

const VICINA_GIORNI = 14;

/** "Controllo oggi 15:30", "Accompagnamento ven 20.11". */
export function descriviProssimo(i: Incontro, today: ISODate): string {
  const quando = i.data === today ? 'oggi' : `${weekdayIT(i.data, true)} ${formatShort(i.data)}`;
  return [TIPO[i.tipo], quando, i.ora].filter(Boolean).join(' ');
}

/** mammaId of the pregnant mamma nearest her DPP, if within 14 days (or past it). */
export function rigaVicina(righe: RigaMamma[], today: ISODate): string | null {
  let best: { id: string; dist: number } | null = null;
  for (const r of righe) {
    if (r.sezione !== 'in_gravidanza' || !r.dpp) continue;
    const giorni = diffDays(today, r.dpp);
    if (giorni > VICINA_GIORNI) continue;
    const dist = Math.abs(giorni);
    if (!best || dist < best.dist) best = { id: r.mammaId, dist };
  }
  return best?.id ?? null;
}

const piega = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export function filtraPerNome(righe: RigaMamma[], q: string): RigaMamma[] {
  const k = piega(q.trim());
  return k ? righe.filter((r) => piega(r.nome).includes(k)) : righe;
}
