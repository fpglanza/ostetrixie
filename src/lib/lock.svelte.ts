import { liveQuery, type Subscription } from 'dexie';
import { tick } from 'svelte';
import { getImpostazioni } from './db';
import {
  STATO_INIZIALE,
  contenutoVisibile,
  dopoErrore,
  dopoImpostazioni,
  dopoNascosto,
  dopoSblocco,
  dopoVisibile,
  verificaConFreno,
  type StatoLock,
} from './lockPolicy';

/** App.svelte wraps the routed content in `[data-contenuto]`; its open dialogs are suspended while hidden. */
const CONTENUTO = '[data-contenuto]';

/**
 * App lock: applies the pure state machine in lockPolicy.ts.
 * - Cold start with a PIN: nothing is mounted until the first unlock.
 * - Later locks (timeout), the background cover and a settings error only HIDE the mounted
 *   content (`hidden` + `inert`), so a half-filled form survives; open modal dialogs are
 *   closed natively meanwhile (a top-layer dialog would show above the lock screen and make
 *   it inert) and reopened, with the scroll position, when the content shows again.
 */
class Lock {
  #s = $state.raw<StatoLock>(STATO_INIZIALE);
  /** Consecutive wrong PINs (lock screen and Impostazioni share it); reset on success. */
  errati = $state(0);
  /** Epoch ms until which no PIN may be tried. */
  attesaFino = $state(0);

  #pinHash: string | undefined;
  #pinSalt: string | undefined;
  #timeoutMinuti = 5;
  #hiddenAt: number | null = null;
  #sub: Subscription | null = null;
  #sospesi: HTMLDialogElement[] = [];
  #scrollY = 0;

  get pronto() {
    return this.#s.pronto;
  }
  get locked() {
    return this.#s.locked;
  }
  get haPin() {
    return this.#s.haPin;
  }
  get errore() {
    return this.#s.errore;
  }
  get contenuto() {
    return this.#s.contenuto;
  }
  get coperto() {
    return this.#s.coperto;
  }
  /** The routed content may be shown (mounted, and not locked, covered or in error). */
  get visibile() {
    return contenutoVisibile(this.#s);
  }

  engage(): void {
    if (this.#s.haPin) this.#applica({ ...this.#s, locked: true });
  }

  /** `scartaDialoghi`: after a data wipe, do not reopen the dialogs that were open. */
  unlock(opts: { scartaDialoghi?: boolean } = {}): void {
    this.errati = 0;
    this.attesaFino = 0;
    if (opts.scartaDialoghi) this.#sospesi = [];
    this.#applica(dopoSblocco(this.#s));
  }

  /** Checks a PIN against the stored one with the 30 s brake. Never 'ok' without a stored hash. */
  async verifica(pin: string): Promise<'ok' | 'errato' | 'attendi'> {
    const freno = { errati: this.errati, attesaFino: this.attesaFino };
    const r = await verificaConFreno(pin, this.#pinHash, this.#pinSalt, freno, Date.now());
    this.errati = r.freno.errati;
    this.attesaFino = r.freno.attesaFino;
    return r.esito;
  }

  /** (Re)subscribes to the settings. An error ends the subscription: the error screen offers `avvia` again. */
  avvia(): void {
    this.#sub?.unsubscribe();
    this.#sub = liveQuery(getImpostazioni).subscribe({
      next: (imp) => {
        this.#pinHash = imp.pinHash;
        this.#pinSalt = imp.pinSalt;
        this.#timeoutMinuti = imp.timeoutMinuti;
        this.#applica(dopoImpostazioni(this.#s, imp));
      },
      error: () => this.#applica(dopoErrore(this.#s)),
    });
  }

  ascoltaVisibilita(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        if (!this.#s.locked) this.#hiddenAt = Date.now();
        this.#applica(dopoNascosto(this.#s));
        return;
      }
      this.#applica(dopoVisibile(this.#s, this.#hiddenAt, Date.now(), this.#timeoutMinuti));
      this.#hiddenAt = null;
    });
  }

  #applica(next: StatoLock): void {
    const prima = contenutoVisibile(this.#s);
    this.#s = next;
    const dopo = contenutoVisibile(next);
    if (prima && !dopo) this.#sospendi();
    else if (!prima && dopo) void this.#ripristina();
  }

  #sospendi(): void {
    this.#scrollY = window.scrollY;
    this.#sospesi = [...document.querySelectorAll<HTMLDialogElement>(`${CONTENUTO} dialog[open]`)];
    for (const d of this.#sospesi) d.close();
  }

  async #ripristina(): Promise<void> {
    const dialoghi = this.#sospesi;
    this.#sospesi = [];
    await tick();
    window.scrollTo(0, this.#scrollY);
    for (const d of dialoghi) if (d.isConnected && !d.open) d.showModal();
  }
}

export const lock = new Lock();

if (typeof document !== 'undefined') {
  lock.avvia();
  lock.ascoltaVisibilita();
}
