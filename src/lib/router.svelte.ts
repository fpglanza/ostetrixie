import { matchRoute, type RouteName } from './routes';

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

if (typeof window !== 'undefined') window.addEventListener('hashchange', sync);

/** Navigate to a hash route, e.g. `#/mamma/nuova`. */
export function navigate(hash: string): void {
  const h = hash.startsWith('#') ? hash : `#${hash}`;
  if (location.hash === h) return;
  location.hash = h;
}
