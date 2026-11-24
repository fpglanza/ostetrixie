import { addDays } from './dates';

type Record_ = Record<string, unknown>;

/** Incontro tipi before v1.2. */
const TIPI_VECCHI = ['controllo', 'accompagnamento', 'altro'];

/**
 * Pre-v1.2 pregnancies could carry a DPP from ultrasound next to the UPM. Now the UPM itself is
 * the dated one (corrected by eco when needed), so a DPP eco becomes UPM = DPP − 280 with upmEco.
 * Their per-pregnancy anamnesi ostetrica moves to gravidanzaAttuale.
 */
export function normalizzaGravidanza<T extends Record_>(g: T): T {
  if (typeof g.dppEco !== 'string' && typeof g.anamnesiOstetrica !== 'string') return g;
  const { dppEco, anamnesiOstetrica, ...resto } = g;
  const n: Record_ = resto;
  if (typeof dppEco === 'string') Object.assign(n, { upm: addDays(dppEco, -280), upmEco: true });
  // It was labelled "anamnesi ostetrica di questa gravidanza": it is what "gravidanza attuale" now holds.
  if (typeof anamnesiOstetrica === 'string') {
    n.gravidanzaAttuale = [anamnesiOstetrica, resto.gravidanzaAttuale].filter(Boolean).join('\n\n');
  }
  return n as T;
}

/**
 * Pre-v1.2 tipi (controllo / accompagnamento / altro) become gravidanza, or puerperio after the
 * birth date; a controllo keeps visita "controllo", an accompagnamento keeps its name in argomento.
 */
export function normalizzaIncontro<T extends Record_>(i: T, dataParto?: string): T {
  if (!TIPI_VECCHI.includes(i.tipo as string)) return i;
  const dopoParto = !!dataParto && (i.data as string) > dataParto;
  const n: Record_ = { ...i, tipo: dopoParto ? 'puerperio' : 'gravidanza' };
  if (i.tipo === 'controllo' && !i.visita) n.visita = 'controllo';
  if (i.tipo === 'accompagnamento' && !i.argomento) n.argomento = 'Accompagnamento alla nascita';
  return n as T;
}
