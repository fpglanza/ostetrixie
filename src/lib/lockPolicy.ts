/** True when the app stayed hidden for longer than the timeout. `hiddenAt` null = never hidden. */
export function shouldLock(hiddenAt: number | null, now: number, timeoutMinuti: number): boolean {
  if (hiddenAt === null) return false;
  return now - hiddenAt > timeoutMinuti * 60_000;
}

export const TENTATIVI_PRIMA_ATTESA = 5;
export const ATTESA_MS = 30_000;

/** Light brute-force brake: after every 5th consecutive wrong PIN, wait 30 s. */
export function attesaDopoErrore(errati: number): number {
  return errati > 0 && errati % TENTATIVI_PRIMA_ATTESA === 0 ? ATTESA_MS : 0;
}
