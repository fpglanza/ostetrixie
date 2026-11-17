/**
 * Hash-navigation guard for a dirty form, free of runes and of `window` so it can be
 * tested against a fake history.
 *
 * Every entry the app has rendered carries a marker in `history.state`. On a hashchange
 * while the form is dirty:
 * - marked entry → a traversal (Back/Forward, any distance). The form's hash is pushed
 *   again with pushState (no event), which drops whatever was "forward" of the target;
 *   the entry just before it is therefore always the target, so confirming is `back()`.
 * - unmarked entry → a new push (link, tab, address bar). We step `back()` to the form
 *   (an expected hashchange, swallowed) and confirming is `forward()` onto the new entry.
 * No position arithmetic: correct after replace, reload, or any mix of pushes and Backs.
 */
export interface Storia {
  hash(): string;
  stato(): unknown;
  /** history.pushState: no hashchange event. */
  pushState(state: object, hash: string): void;
  /** history.replaceState: no hashchange event. */
  replaceState(state: object, hash: string): void;
  /** location.hash = …: new entry, hashchange when the hash differs. */
  assegna(hash: string): void;
  back(): void;
  forward(): void;
}

export interface OpzioniGuardia {
  dirty: () => boolean;
  /** Ask the user; true = leave without saving. Called at most once per pending exit. */
  chiedi: () => Promise<boolean>;
  /** Render the route for the current hash. */
  sync: () => void;
}

const MARCA = 'ostetrixie';
const marca = () => ({ [MARCA]: 1 });
const marcato = (s: unknown) =>
  !!s && typeof s === 'object' && (s as Record<string, unknown>)[MARCA] === 1;

export function creaGuardia(storia: Storia, { dirty, chiedi, sync }: OpzioniGuardia) {
  /** Hash of the screen on display. */
  let corrente = storia.hash();
  /** Restore hashchanges we caused with back(); each lands on `corrente`. */
  let attesi = 0;
  /** What confirming will do; the latest attempt wins while the dialog is open. */
  let pendente: 'back' | 'forward' | null = null;
  let chiedendo = false;

  function marcaCorrente() {
    if (!marcato(storia.stato())) storia.replaceState(marca(), storia.hash());
  }
  marcaCorrente();

  function onHashChange() {
    const h = storia.hash();
    if (attesi > 0 && h === corrente) {
      attesi--;
      return;
    }
    if (!dirty()) {
      marcaCorrente();
      corrente = h;
      sync();
      return;
    }
    if (h === corrente) return;
    if (marcato(storia.stato())) {
      storia.pushState(marca(), corrente);
      pendente = 'back';
    } else {
      attesi++;
      storia.back();
      pendente = 'forward';
    }
    if (chiedendo) return;
    chiedendo = true;
    chiedi().then((ok) => {
      chiedendo = false;
      const p = pendente;
      pendente = null;
      if (!ok || !p) return;
      if (p === 'back') storia.back();
      else storia.forward();
    });
  }

  /** Programmatic navigation. `replace` swaps the current entry and renders at once. */
  function navigate(hash: string, replace = false) {
    if (replace) {
      storia.replaceState(marca(), hash);
      corrente = hash;
      sync();
    } else if (storia.hash() === hash) {
      sync();
    } else {
      storia.assegna(hash);
    }
  }

  return { onHashChange, navigate };
}
