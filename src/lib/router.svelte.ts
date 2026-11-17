import { matchRoute, type RouteName } from './routes';
import { confermaUscita, unsaved } from './unsaved.svelte';

function current() {
  const path = typeof location === 'undefined' ? '' : location.hash;
  return { path, ...matchRoute(path) };
}

const initial = current();

export const router = $state<{ path: string; name: RouteName; params: Record<string, string> }>({
  path: initial.path,
  name: initial.name,
  params: initial.params,
});

function sync() {
  const next = current();
  router.path = next.path;
  router.name = next.name;
  router.params = next.params;
}

// Each history entry is stamped with an increasing number so a hash change can be
// undone (history.go) while the user decides whether to leave a dirty form.
let posizione = 0;
let massimo = 0;

function timbra() {
  const n = history.state?.n;
  if (typeof n === 'number') {
    posizione = n;
    massimo = Math.max(massimo, n);
  } else {
    posizione = ++massimo;
    history.replaceState({ ...(history.state ?? {}), n: posizione }, '');
  }
}

let ripristino = false;
let rinvio: number | null = null;

function onHashChange() {
  if (ripristino) {
    // Our own history.go back to the dirty form: the screen never changed.
    ripristino = false;
    timbra();
    return;
  }
  if (unsaved.dirty) {
    const n = history.state?.n;
    // Unstamped entry = a new navigation (link, tab, navigate()): one step forward.
    const delta = (typeof n === 'number' ? n - posizione : 1) || 1;
    ripristino = true;
    history.go(-delta);
    if (rinvio !== null) return;
    rinvio = delta;
    confermaUscita().then((ok) => {
      const d = rinvio!;
      rinvio = null;
      if (ok) history.go(d);
    });
    return;
  }
  timbra();
  sync();
}

if (typeof window !== 'undefined') {
  timbra();
  window.addEventListener('hashchange', onHashChange);
}

/** Navigate to a hash route, e.g. `#/mamma/nuova`; `replace` swaps the current history entry. */
export function navigate(hash: string, opts: { replace?: boolean } = {}): void {
  const h = hash.startsWith('#') ? hash : `#${hash}`;
  if (location.hash === h) return;
  if (opts.replace) location.replace(h);
  else location.hash = h;
}
