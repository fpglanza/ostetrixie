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
