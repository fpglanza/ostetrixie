import { lock } from './lock.svelte';
import { creaGuardia } from './navGuard';
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

const url = (h: string) => location.pathname + location.search + h;

// Hash changes go through the unsaved-changes guard (see navGuard.ts).
const guardia =
  typeof window === 'undefined'
    ? null
    : creaGuardia(
        {
          hash: () => location.hash,
          stato: () => history.state,
          pushState: (s, h) => history.pushState(s, '', url(h)),
          replaceState: (s, h) => history.replaceState(s, '', url(h)),
          assegna: (h) => {
            location.hash = h;
          },
          back: () => history.back(),
          forward: () => history.forward(),
        },
        { dirty: () => unsaved.dirty, bloccato: () => !lock.visibile, chiedi: confermaUscita, sync },
      );

if (guardia) window.addEventListener('hashchange', guardia.onHashChange);

/** Navigate to a hash route, e.g. `#/mamma/nuova`; `replace` swaps the current history entry. */
export function navigate(hash: string, opts: { replace?: boolean } = {}): void {
  const h = hash.startsWith('#') ? hash : `#${hash}`;
  guardia?.navigate(h, opts.replace);
}
