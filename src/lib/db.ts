import Dexie, { type Table } from 'dexie';
import type { Gravidanza, Impostazioni, Incontro, Mamma } from './types';

class OstetrixieDB extends Dexie {
  mamme!: Table<Mamma, string>;
  gravidanze!: Table<Gravidanza, string>;
  incontri!: Table<Incontro, string>;
  impostazioni!: Table<Impostazioni, string>;

  constructor() {
    super('ostetrixie');
    this.version(1).stores({
      mamme: 'id, archiviata',
      gravidanze: 'id, mammaId, stato',
      incontri: 'id, gravidanzaId, data, stato',
      impostazioni: 'id'
    });
  }
}

export const db = new OstetrixieDB();

export async function getImpostazioni(): Promise<Impostazioni> {
  return (await db.impostazioni.get('main')) ?? { id: 'main', timeoutMinuti: 5 };
}

/**
 * Merges `patch` into the settings (never drops other fields such as ultimoBackup).
 * A key set to `undefined` is removed. Pass plain values, never Svelte $state proxies.
 */
export async function aggiornaImpostazioni(patch: Partial<Omit<Impostazioni, 'id'>>): Promise<void> {
  await db.transaction('rw', db.impostazioni, async () => {
    const next: Record<string, unknown> = { ...(await getImpostazioni()), ...patch, id: 'main' };
    for (const k of Object.keys(next)) if (next[k] === undefined) delete next[k];
    await db.impostazioni.put(next as unknown as Impostazioni);
  });
}

/** Forgotten PIN / reset: erases all data and settings (PIN included) in one transaction. */
export async function cancellaTuttiIDati(): Promise<void> {
  await db.transaction('rw', [db.mamme, db.gravidanze, db.incontri, db.impostazioni], async () => {
    await Promise.all([db.mamme.clear(), db.gravidanze.clear(), db.incontri.clear(), db.impostazioni.clear()]);
  });
}
