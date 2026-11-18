import { liveQuery } from 'dexie';
import { getImpostazioni } from './db';
import { attesaDopoErrore, shouldLock } from './lockPolicy';
import { verifyPin } from './pin';
import { rispondiUscita, uscita } from './unsaved.svelte';

/**
 * App lock. Starts locked when a PIN exists; while the app is hidden it records `hiddenAt`
 * and on return locks if it stayed away longer than the timeout. App.svelte renders no
 * content at all while `locked` (or until the settings are read: `pronto`).
 */
class Lock {
  locked = $state(true);
  pronto = $state(false);
  haPin = $state(false);
  /** Consecutive wrong PINs (lock screen and Impostazioni share it); reset on success. */
  errati = $state(0);
  /** Epoch ms until which no PIN may be tried. */
  attesaFino = $state(0);

  #pinHash: string | undefined;
  #pinSalt: string | undefined;
  #timeoutMinuti = 5;
  #hiddenAt: number | null = null;

  engage(): void {
    if (!this.haPin) return;
    // The screen under a pending "Uscire senza salvare?" is going away: answer "stay".
    if (uscita.chiede) rispondiUscita(false);
    this.locked = true;
  }

  unlock(): void {
    this.locked = false;
    this.errati = 0;
    this.attesaFino = 0;
  }

  /** Checks a PIN against the stored one, counting failures and applying the 30 s brake. */
  async verifica(pin: string): Promise<'ok' | 'errato' | 'attendi'> {
    if (Date.now() < this.attesaFino) return 'attendi';
    if (!this.#pinHash || !this.#pinSalt) return 'ok';
    if (await verifyPin(pin, this.#pinHash, this.#pinSalt)) {
      this.errati = 0;
      this.attesaFino = 0;
      return 'ok';
    }
    this.errati += 1;
    const attesa = attesaDopoErrore(this.errati);
    if (attesa) this.attesaFino = Date.now() + attesa;
    return 'errato';
  }

  avvia(): void {
    liveQuery(getImpostazioni).subscribe({
      next: (imp) => {
        this.#pinHash = imp.pinHash;
        this.#pinSalt = imp.pinSalt;
        this.#timeoutMinuti = imp.timeoutMinuti;
        this.haPin = Boolean(imp.pinHash && imp.pinSalt);
        if (!this.pronto) {
          this.locked = this.haPin;
          this.pronto = true;
        } else if (!this.haPin) {
          this.locked = false;
        }
      },
      // Settings unreadable: fail closed only if we already knew a PIN existed.
      error: () => {
        if (!this.pronto) {
          this.locked = false;
          this.pronto = true;
        }
      },
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        if (!this.locked) this.#hiddenAt = Date.now();
        return;
      }
      if (shouldLock(this.#hiddenAt, Date.now(), this.#timeoutMinuti)) this.engage();
      this.#hiddenAt = null;
    });
  }
}

export const lock = new Lock();

if (typeof window !== 'undefined') lock.avvia();
