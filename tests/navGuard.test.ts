import { beforeEach, describe, expect, it } from 'vitest';
import { creaGuardia, type Storia } from '../src/lib/navGuard';

/** Browser-like history: pushState/replaceState are silent; assegna fires hashchange later;
 * back/forward are queued traversals that fire hashchange when the hash differs. */
class FakeHistory implements Storia {
  entries: { hash: string; state: unknown }[];
  i: number;
  coda: (() => void)[] = [];
  onhash: () => void = () => {};

  constructor(hash: string) {
    this.entries = [{ hash, state: null }];
    this.i = 0;
  }
  hash() {
    return this.entries[this.i].hash;
  }
  stato() {
    return this.entries[this.i].state;
  }
  pushState(state: object, hash: string) {
    this.entries.splice(this.i + 1);
    this.entries.push({ hash, state });
    this.i++;
  }
  replaceState(state: object, hash: string) {
    this.entries[this.i] = { hash, state };
  }
  assegna(hash: string) {
    if (hash === this.hash()) return;
    this.entries.splice(this.i + 1);
    this.entries.push({ hash, state: null });
    this.i++;
    this.coda.push(() => this.onhash());
  }
  private vai(d: number) {
    this.coda.push(() => {
      const j = this.i + d;
      if (j < 0 || j >= this.entries.length) return;
      const prima = this.hash();
      this.i = j;
      if (this.hash() !== prima) this.onhash();
    });
  }
  back() {
    this.vai(-1);
  }
  forward() {
    this.vai(1);
  }
  async flush() {
    for (let k = 0; k < 50; k++) {
      await Promise.resolve();
      const f = this.coda.shift();
      if (f) f();
      else if (k > 3) return;
    }
  }
}

let h: FakeHistory;
let dirty: boolean;
let domande: number;
let risposta: ((ok: boolean) => void) | null;
let reso: string;
let guardia: ReturnType<typeof creaGuardia>;

function avvia() {
  guardia = creaGuardia(h, {
    dirty: () => dirty,
    chiedi: () => {
      domande++;
      return new Promise((r) => (risposta = r));
    },
    sync: () => (reso = h.hash()),
  });
  h.onhash = guardia.onHashChange;
}

async function rispondi(ok: boolean) {
  dirty = !ok && dirty;
  const r = risposta!;
  risposta = null;
  r(ok);
  await h.flush();
}

/** Click a link / tab: a new entry. */
async function apri(hash: string) {
  h.assegna(hash);
  await h.flush();
}
async function indietro() {
  h.back();
  await h.flush();
}
async function avanti() {
  h.forward();
  await h.flush();
}

const M = '#/';
const S = '#/mamma/c';
const F = '#/gravidanza/g/incontro/nuovo';
const C = '#/calendario';

beforeEach(() => {
  h = new FakeHistory(M);
  dirty = false;
  domande = 0;
  risposta = null;
  reso = M;
  avvia();
});

describe('navGuard', () => {
  it('clean navigation is unaffected', async () => {
    await apri(S);
    await apri(F);
    await indietro();
    expect(reso).toBe(S);
    await indietro();
    expect(reso).toBe(M);
    await avanti();
    expect(reso).toBe(S);
    expect(domande).toBe(0);
  });

  it('push / back / push, then Back on the dirty form (review repro)', async () => {
    await apri(S);
    await apri(F);
    await indietro();
    await apri(F);
    dirty = true;
    await indietro();
    expect(domande).toBe(1);
    expect(h.hash()).toBe(F);
    expect(reso).toBe(F);
    await rispondi(false); // Annulla
    expect(h.hash()).toBe(F);
    dirty = true;
    await indietro(); // asks again
    expect(domande).toBe(2);
    expect(h.hash()).toBe(F);
    await rispondi(true); // Esci senza salvare
    expect(h.hash()).toBe(S);
    expect(reso).toBe(S);
    await indietro(); // exactly one step: no overshoot
    expect(reso).toBe(M);
  });

  it('tab tap on a dirty form: asks, restores, confirm opens the tab', async () => {
    await apri(S);
    await apri(F);
    dirty = true;
    await apri(C);
    expect(domande).toBe(1);
    expect(h.hash()).toBe(F);
    expect(reso).toBe(F);
    await rispondi(true);
    expect(reso).toBe(C);
    expect(h.hash()).toBe(C);
    await indietro();
    expect(reso).toBe(F);
  });

  it('replace then Back', async () => {
    await apri(S);
    await apri(F);
    guardia.navigate('#/incontro/i', true); // first save of "Salva e copia"
    expect(reso).toBe('#/incontro/i');
    dirty = true;
    await indietro();
    expect(domande).toBe(1);
    expect(h.hash()).toBe('#/incontro/i');
    await rispondi(true);
    expect(reso).toBe(S);
    await indietro();
    expect(reso).toBe(M);
  });

  it('Forward on a dirty form', async () => {
    await apri(F);
    await apri(C);
    await indietro();
    expect(reso).toBe(F);
    dirty = true;
    await avanti();
    expect(domande).toBe(1);
    expect(h.hash()).toBe(F);
    expect(reso).toBe(F);
    await rispondi(true);
    expect(reso).toBe(C);
  });

  it('reload mid-stack keeps working', async () => {
    await apri(S);
    await apri(F);
    await indietro();
    await indietro();
    avvia(); // page reload: state survives, guard starts over
    await avanti();
    expect(reso).toBe(S);
    await avanti();
    expect(reso).toBe(F);
    dirty = true;
    await indietro();
    expect(domande).toBe(1);
    expect(h.hash()).toBe(F);
    await rispondi(true);
    expect(reso).toBe(S);
    await indietro();
    expect(reso).toBe(M);
  });

  it('double Back while the dialog is open asks once and leaves one step', async () => {
    await apri(S);
    await apri(F);
    dirty = true;
    await indietro();
    await indietro();
    expect(domande).toBe(1);
    expect(h.hash()).toBe(F);
    expect(reso).toBe(F);
    await rispondi(true);
    expect(reso).toBe(S);
    await indietro();
    expect(reso).toBe(M);
  });

  it('rapid double Back before the restore lands', async () => {
    await apri(S);
    await apri(F);
    dirty = true;
    h.assegna(C); // tab tap…
    h.back(); // …and Back before anything settles
    await h.flush();
    expect(domande).toBe(1);
    expect(h.hash()).toBe(F);
    expect(reso).toBe(F);
    await rispondi(true);
    expect(reso).toBe(S);
  });

  it('navigate syncs even when the hash is already current', () => {
    reso = '';
    guardia.navigate(M, true);
    expect(reso).toBe(M);
    reso = '';
    guardia.navigate(M);
    expect(reso).toBe(M);
  });
});
