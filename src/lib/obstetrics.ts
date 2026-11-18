import { addDays, diffDays, type ISODate } from './dates';
import type { Gravidanza } from './types';

export const STAZIONI_SETTIMANE = [13, 27, 37, 40];

const GESTATION_DAYS = 280;
const MAX_DAYS = 308; // 44 weeks

export interface EG {
  settimane: number;
  giorni: number;
  totaleGiorni: number;
  fuoriRange: boolean;
}

export function dppFromUpm(upm: ISODate): ISODate {
  return addDays(upm, GESTATION_DAYS);
}

export function dppEffettiva(g: Pick<Gravidanza, 'upm' | 'dppEco'>): ISODate | null {
  if (g.dppEco) return g.dppEco;
  if (g.upm) return dppFromUpm(g.upm);
  return null;
}

export function egAt(g: Pick<Gravidanza, 'upm' | 'dppEco'>, date: ISODate): EG | null {
  const dpp = dppEffettiva(g);
  if (!dpp) return null;
  const totaleGiorni = diffDays(addDays(dpp, -GESTATION_DAYS), date);
  return {
    settimane: Math.floor(totaleGiorni / 7),
    giorni: ((totaleGiorni % 7) + 7) % 7,
    totaleGiorni,
    fuoriRange: totaleGiorni < 0 || totaleGiorni > MAX_DAYS,
  };
}

export function formatEG(eg: EG): string {
  return `${eg.settimane}+${eg.giorni}`;
}

export function postPartumAt(dataParto: ISODate, date: ISODate): string | null {
  const n = diffDays(dataParto, date);
  if (n < 0) return null;
  return n > 14 ? `parto +${Math.floor(n / 7)} sett` : `parto +${n} gg`;
}

export function stationPosition(totaleGiorni: number): number {
  return Math.min(1, Math.max(0, totaleGiorni / GESTATION_DAYS));
}
