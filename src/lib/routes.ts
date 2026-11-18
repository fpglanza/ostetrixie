export type RouteName =
  | 'mamme'
  | 'mammaNuova'
  | 'scheda'
  | 'mammaModifica'
  | 'incontroNuovo'
  | 'incontro'
  | 'calendario'
  | 'impostazioni'
  | 'aiuto';

export interface Route {
  name: RouteName;
  params: Record<string, string>;
}

// Order matters: literal segments before `:param` ones.
const PATTERNS: [string, RouteName][] = [
  ['/', 'mamme'],
  ['/mamma/nuova', 'mammaNuova'],
  ['/mamma/:id', 'scheda'],
  ['/mamma/:id/modifica', 'mammaModifica'],
  ['/gravidanza/:gid/incontro/nuovo', 'incontroNuovo'],
  ['/incontro/:id', 'incontro'],
  ['/calendario', 'calendario'],
  ['/impostazioni', 'impostazioni'],
  ['/aiuto', 'aiuto'],
];

const segments = (p: string) => p.split('/').filter(Boolean);

function decode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** Pure hash → route resolution. Unknown paths fall back to `mamme`. */
export function matchRoute(hash: string): Route {
  const parts = segments(hash.replace(/^#/, ''));
  for (const [pattern, name] of PATTERNS) {
    const pat = segments(pattern);
    if (pat.length !== parts.length) continue;
    const params: Record<string, string> = {};
    const ok = pat.every((seg, i) => {
      if (seg.startsWith(':')) {
        params[seg.slice(1)] = decode(parts[i]);
        return true;
      }
      return seg === parts[i];
    });
    if (ok) return { name, params };
  }
  return { name: 'mamme', params: {} };
}
