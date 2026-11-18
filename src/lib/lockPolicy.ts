import { verifyPin } from './pin';

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

// --- Lock state machine (pure; lock.svelte.ts applies it) -------------------

export interface StatoLock {
  /** Settings read at least once (or failed): until then nothing renders. */
  pronto: boolean;
  locked: boolean;
  haPin: boolean;
  /** Settings unreadable: an error screen replaces everything, fail closed. */
  errore: boolean;
  /** The routed content has been mounted once; afterwards it is only hidden, never unmounted. */
  contenuto: boolean;
  /** App in background with a PIN: opaque cover so the app-switcher snapshot shows no data. */
  coperto: boolean;
}

export const STATO_INIZIALE: StatoLock = {
  pronto: false,
  locked: true,
  haPin: false,
  errore: false,
  contenuto: false,
  coperto: false
};

export function contenutoVisibile(s: StatoLock): boolean {
  return s.pronto && s.contenuto && !s.locked && !s.errore && !s.coperto;
}

/**
 * Whether a modal dialog may be open. One inside the app content waits while the content is
 * hidden (a top-layer modal would sit above the lock screen and make it inert); one outside
 * it (the lock screen's own) is unaffected.
 */
export function dialogoMostrato(open: boolean, nelContenuto: boolean, contenutoVisibile: boolean): boolean {
  return open && (!nelContenuto || contenutoVisibile);
}

export function dopoImpostazioni(s: StatoLock, imp: { pinHash?: string; pinSalt?: string }): StatoLock {
  const haPin = Boolean(imp.pinHash && imp.pinSalt);
  // First read, or recovery from an error (we were locked): decide afresh from the settings.
  // Otherwise a newly set PIN does not lock right away, and a removed one unlocks.
  const locked = !s.pronto || s.errore ? haPin : s.locked && haPin;
  return { ...s, pronto: true, errore: false, haPin, locked, contenuto: s.contenuto || !locked };
}

export function dopoErrore(s: StatoLock): StatoLock {
  return { ...s, pronto: true, errore: true, locked: true };
}

export function dopoSblocco(s: StatoLock): StatoLock {
  return { ...s, locked: false, coperto: false, contenuto: true };
}

export function dopoNascosto(s: StatoLock): StatoLock {
  return { ...s, coperto: s.haPin && !s.locked };
}

export function dopoVisibile(s: StatoLock, hiddenAt: number | null, now: number, timeoutMinuti: number): StatoLock {
  const scaduto = s.haPin && shouldLock(hiddenAt, now, timeoutMinuti);
  return { ...s, coperto: false, locked: s.locked || scaduto };
}

// --- PIN check with the brute-force brake -----------------------------------

export interface Freno {
  errati: number;
  attesaFino: number;
}

/** Never 'ok' without a loaded hash and salt. */
export async function verificaConFreno(
  pin: string,
  hash: string | undefined,
  salt: string | undefined,
  freno: Freno,
  now: number
): Promise<{ esito: 'ok' | 'errato' | 'attendi'; freno: Freno }> {
  if (now < freno.attesaFino) return { esito: 'attendi', freno };
  if (hash && salt && (await verifyPin(pin, hash, salt))) {
    return { esito: 'ok', freno: { errati: 0, attesaFino: 0 } };
  }
  const errati = freno.errati + 1;
  const attesa = attesaDopoErrore(errati);
  return { esito: 'errato', freno: { errati, attesaFino: attesa ? now + attesa : freno.attesaFino } };
}
