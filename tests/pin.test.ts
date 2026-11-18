import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { hashPin, isValidPin, verifyPin } from '../src/lib/pin';
import { aggiornaImpostazioni, cancellaTuttiIDati, db, getImpostazioni } from '../src/lib/db';
import { createMamma, saveIncontro } from '../src/lib/repo';

describe('hashPin / verifyPin', () => {
  it('verifies the right PIN and rejects a wrong one', async () => {
    const { hash, salt } = await hashPin('1234');
    expect(await verifyPin('1234', hash, salt)).toBe(true);
    expect(await verifyPin('1235', hash, salt)).toBe(false);
  });

  it('uses a random salt, so the same PIN hashes differently', async () => {
    const a = await hashPin('1234');
    const b = await hashPin('1234');
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
  });

  it('is deterministic for a given salt (base64, 32-byte key)', async () => {
    const salt = new Uint8Array(16).fill(7);
    const a = await hashPin('9876', salt);
    const b = await hashPin('9876', salt);
    expect(a).toEqual(b);
    expect(atob(a.hash)).toHaveLength(32);
  });

  it('returns false for a corrupted stored hash instead of throwing', async () => {
    const { salt } = await hashPin('1234');
    expect(await verifyPin('1234', 'AAAA', salt)).toBe(false);
  });
});

describe('isValidPin', () => {
  it('accepts 4 to 6 digits only', () => {
    expect(isValidPin('123')).toBe(false);
    expect(isValidPin('1234')).toBe(true);
    expect(isValidPin('123456')).toBe(true);
    expect(isValidPin('1234567')).toBe(false);
    expect(isValidPin('12a4')).toBe(false);
    expect(isValidPin('')).toBe(false);
  });
});

describe('impostazioni', () => {
  beforeEach(async () => {
    await Promise.all([db.mamme.clear(), db.gravidanze.clear(), db.incontri.clear(), db.impostazioni.clear()]);
  });

  it('aggiornaImpostazioni merges and keeps ultimoBackup', async () => {
    await db.impostazioni.put({ id: 'main', timeoutMinuti: 5, ultimoBackup: '2026-11-01T10:00:00.000Z' });
    await aggiornaImpostazioni({ pinHash: 'h', pinSalt: 's' });
    await aggiornaImpostazioni({ timeoutMinuti: 15 });
    expect(await getImpostazioni()).toEqual({
      id: 'main',
      timeoutMinuti: 15,
      ultimoBackup: '2026-11-01T10:00:00.000Z',
      pinHash: 'h',
      pinSalt: 's'
    });
  });

  it('aggiornaImpostazioni with undefined removes the PIN', async () => {
    await db.impostazioni.put({ id: 'main', timeoutMinuti: 1, pinHash: 'h', pinSalt: 's' });
    await aggiornaImpostazioni({ pinHash: undefined, pinSalt: undefined });
    const imp = await getImpostazioni();
    expect(imp.pinHash).toBeUndefined();
    expect(imp.pinSalt).toBeUndefined();
    expect(imp.timeoutMinuti).toBe(1);
  });

  it('cancellaTuttiIDati empties every table, PIN included', async () => {
    const { gravidanza } = await createMamma({ nome: 'Anna', archiviata: false }, { upm: '2026-03-01' });
    await saveIncontro({
      gravidanzaId: gravidanza.id,
      data: '2026-05-01',
      stato: 'fatto',
      tipo: 'controllo',
      partnerPresente: 'si'
    });
    await aggiornaImpostazioni({ pinHash: 'h', pinSalt: 's' });
    await cancellaTuttiIDati();
    expect(await db.mamme.count()).toBe(0);
    expect(await db.gravidanze.count()).toBe(0);
    expect(await db.incontri.count()).toBe(0);
    expect(await db.impostazioni.count()).toBe(0);
    expect((await getImpostazioni()).pinHash).toBeUndefined();
  });
});
