export type ISODate = string;

const DAY_MS = 86_400_000;
const RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parse(d: ISODate): number {
  const m = RE.exec(d);
  if (!m) throw new Error(`Data non valida: ${d}`);
  return Date.UTC(+m[1], +m[2] - 1, +m[3]);
}

function fmt(ms: number): ISODate {
  const dt = new Date(ms);
  const y = String(dt.getUTCFullYear()).padStart(4, '0');
  const mo = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const da = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

/** Local calendar date of `now`. */
export function todayISO(now: Date = new Date()): ISODate {
  const y = String(now.getFullYear()).padStart(4, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(d: ISODate, n: number): ISODate {
  return fmt(parse(d) + n * DAY_MS);
}

export function diffDays(from: ISODate, to: ISODate): number {
  return Math.round((parse(to) - parse(from)) / DAY_MS);
}

export function formatIT(d: ISODate): string {
  return `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
}

export function formatShort(d: ISODate): string {
  return `${d.slice(8, 10)}.${d.slice(5, 7)}`;
}

export function isValidISODate(s: string): boolean {
  const m = RE.exec(s);
  if (!m) return false;
  return fmt(Date.UTC(+m[1], +m[2] - 1, +m[3])) === s;
}

const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];

/** Italian weekday name of `d` ("martedì"), or its 3-letter form ("mar") when `short`. */
export function weekdayIT(d: ISODate, short = false): string {
  const name = GIORNI[new Date(parse(d)).getUTCDay()];
  return short ? name.slice(0, 3) : name;
}

/** ISO weekday of `d`: 1 = Monday … 7 = Sunday. */
export function isoWeekday(d: ISODate): number {
  return new Date(parse(d)).getUTCDay() || 7;
}
