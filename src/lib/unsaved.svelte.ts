/**
 * Shared "unsaved changes" guard. A form sets `unsaved.dirty`; anything that would
 * leave the screen (router, update banner) awaits `confermaUscita()` first.
 * App.svelte renders the "Uscire senza salvare?" dialog from `uscita.chiede`.
 */
export const unsaved = $state({ dirty: false });

export const uscita = $state({ chiede: false });

let attese: ((ok: boolean) => void)[] = [];

/** Resolves true right away when nothing is dirty, else after the user answers the dialog. */
export function confermaUscita(): Promise<boolean> {
  if (!unsaved.dirty) return Promise.resolve(true);
  uscita.chiede = true;
  return new Promise((resolve) => attese.push(resolve));
}

/** Called by the dialog. Confirming discards the changes (dirty = false). */
export function rispondiUscita(ok: boolean): void {
  uscita.chiede = false;
  if (ok) unsaved.dirty = false;
  const pending = attese;
  attese = [];
  for (const r of pending) r(ok);
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', (e) => {
    if (!unsaved.dirty) return;
    e.preventDefault();
    e.returnValue = '';
  });
}
