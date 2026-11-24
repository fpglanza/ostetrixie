import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  backupFilename,
  buildBackup,
  condividiOScarica,
  descriviUltimoBackup,
  restoreBackup,
  segnaBackupFatto,
  validateBackup,
  type Backup
} from '../src/lib/backup';
import { db, getImpostazioni } from '../src/lib/db';
import { createMamma, getAllData, saveIncontro } from '../src/lib/repo';

const inc = {
  stato: 'fatto' as const,
  tipo: 'gravidanza' as const,
  partnerPresente: 'si' as const
};

async function seed() {
  const a = await createMamma({ nome: 'Anna', archiviata: false }, { upm: '2026-03-01' });
  const b = await createMamma(
    { nome: 'Bea', cognome: 'Rossi', dataNascita: '1990-02-03', archiviata: false },
    { upm: '2026-01-10', upmEco: true, partner: 'Luca' }
  );
  await saveIncontro({ ...inc, gravidanzaId: a.gravidanza.id, data: '2026-05-01', pesoKg: 61.5 });
  await saveIncontro({ ...inc, gravidanzaId: a.gravidanza.id, data: '2026-06-01', ora: '10:30' });
  await saveIncontro({ ...inc, gravidanzaId: b.gravidanza.id, data: '2026-05-15' });
  return { a, b };
}

/** A minimal valid backup, cloned so each test can tamper with it. */
function valido(): Backup {
  const t = '2026-11-17T09:00:00.000Z';
  return structuredClone({
    formato: 'ostetrixie',
    versione: 1,
    esportatoIl: t,
    mamme: [{ id: 'm1', nome: 'Anna', archiviata: false, createdAt: t, updatedAt: t }],
    gravidanze: [
      { id: 'g1', mammaId: 'm1', upm: '2026-03-01', stato: 'in_corso', createdAt: t, updatedAt: t }
    ],
    incontri: [
      {
        id: 'i1',
        gravidanzaId: 'g1',
        data: '2026-05-01',
        stato: 'fatto',
        tipo: 'gravidanza',
        partnerPresente: 'si',
        createdAt: t,
        updatedAt: t
      }
    ]
  } as Backup);
}

function errore(raw: unknown): string {
  const r = validateBackup(raw);
  if (r.ok) throw new Error('expected validation to fail');
  return r.errore;
}

beforeEach(async () => {
  await db.delete();
  await db.open();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('backup', () => {
  it('round trip: build → wipe → restore gives back the same data', async () => {
    await seed();
    const original = await getAllData();
    expect(original.mamme).toHaveLength(2);
    expect(original.incontri).toHaveLength(3);

    const b = await buildBackup();
    expect(b.formato).toBe('ostetrixie');
    expect(b.versione).toBe(1);
    // Survives serialisation to a file and back.
    const parsed = validateBackup(JSON.parse(JSON.stringify(b)));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.riepilogo).toEqual({ mamme: 2, incontri: 3, esportatoIl: b.esportatoIl });

    await db.delete();
    await db.open();
    expect((await getAllData()).mamme).toHaveLength(0);

    await restoreBackup(parsed.backup);
    const sort = <T extends { id: string }>(xs: T[]) => [...xs].sort((x, y) => x.id.localeCompare(y.id));
    const after = await getAllData();
    expect(sort(after.mamme)).toEqual(sort(original.mamme));
    expect(sort(after.gravidanze)).toEqual(sort(original.gravidanze));
    expect(sort(after.incontri)).toEqual(sort(original.incontri));
  });

  it('restore replaces existing data and leaves impostazioni alone', async () => {
    await seed();
    await db.impostazioni.put({ id: 'main', pinHash: 'h', pinSalt: 's', timeoutMinuti: 2 });
    await restoreBackup(valido());
    const after = await getAllData();
    expect(after.mamme.map((m) => m.id)).toEqual(['m1']);
    expect(after.incontri.map((i) => i.id)).toEqual(['i1']);
    expect(await getImpostazioni()).toEqual({ id: 'main', pinHash: 'h', pinSalt: 's', timeoutMinuti: 2 });
  });

  it('a restore that fails mid-way leaves the previous data intact', async () => {
    await seed();
    const before = await getAllData();
    vi.spyOn(db.incontri, 'bulkAdd').mockRejectedValue(new Error('disco pieno'));
    await expect(restoreBackup(valido())).rejects.toThrow();
    vi.restoreAllMocks();
    const after = await getAllData();
    expect(after).toEqual(before);
  });

  it('rejects a file that is not an Ostetrixie backup', () => {
    expect(errore({ formato: 'altro' })).toMatch(/non è un backup di Ostetrixie/);
    expect(errore(null)).toMatch(/non è un backup di Ostetrixie/);
    expect(errore([1, 2])).toMatch(/non è un backup di Ostetrixie/);
    expect(errore('ciao')).toMatch(/non è un backup di Ostetrixie/);
  });

  it('rejects a newer version with a dedicated message', () => {
    expect(errore({ ...valido(), versione: 2 })).toMatch(/versione più recente/);
  });

  it('rejects a version that is not the number 1', () => {
    for (const v of ['1', 0, undefined, 0.5, NaN]) {
      const e = errore({ ...valido(), versione: v });
      expect(e).toMatch(/versione/);
      expect(e).not.toMatch(/più recente/);
    }
  });

  it('rejects tables that are not arrays', () => {
    expect(errore({ ...valido(), mamme: {} })).toMatch(/mamme/);
    const b = valido() as unknown as Record<string, unknown>;
    delete b.incontri;
    expect(errore(b)).toMatch(/incontri/);
  });

  it('rejects an incontro without data', () => {
    const b = valido();
    delete (b.incontri[0] as Partial<Backup['incontri'][number]>).data;
    expect(errore(b)).toMatch(/incontro.*data/i);
  });

  it('rejects records without a string id or with duplicate ids', () => {
    const b = valido();
    (b.mamme[0] as { id: unknown }).id = 7;
    expect(errore(b)).toMatch(/id/);
    const d = valido();
    d.incontri.push({ ...d.incontri[0] });
    expect(errore(d)).toMatch(/duplicat/);
  });

  it('rejects missing required fields and bad enum values', () => {
    const m = valido();
    delete (m.mamme[0] as { nome?: string }).nome;
    expect(errore(m)).toMatch(/nome/);
    const g = valido();
    delete (g.gravidanze[0] as { mammaId?: string }).mammaId;
    expect(errore(g)).toMatch(/mammaId|mamma/);
    for (const [k, v] of [
      ['stato', 'boh'],
      ['tipo', 'visita'],
      ['partnerPresente', true]
    ] as const) {
      const i = valido();
      (i.incontri[0] as unknown as Record<string, unknown>)[k] = v;
      expect(errore(i)).toMatch(new RegExp(k));
    }
  });

  it('rejects every malformed date field', () => {
    const casi: [(b: Backup) => void, RegExp][] = [
      [(b) => (b.gravidanze[0].upm = '2026-02-30'), /upm/],
      [(b) => ((b.gravidanze[0] as unknown as Record<string, unknown>).dppEco = '20/10/2026'), /dppEco/],
      [(b) => (b.gravidanze[0].dataParto = '2026-13-01'), /dataParto/],
      [(b) => (b.mamme[0].dataNascita = 'ieri'), /dataNascita/],
      [(b) => (b.incontri[0].data = '2026-5-1'), /data/]
    ];
    for (const [rompi, re] of casi) {
      const b = valido();
      rompi(b);
      expect(errore(b)).toMatch(re);
    }
  });

  it('rejects wrongly typed optional fields', () => {
    const b = valido();
    (b.incontri[0] as unknown as Record<string, unknown>).ora = 1030;
    expect(errore(b)).toMatch(/ora/);
    const c = valido();
    (c.incontri[0] as unknown as Record<string, unknown>).pesoKg = '60';
    expect(errore(c)).toMatch(/pesoKg/);
  });

  it('rejects broken references between tables', () => {
    const g = valido();
    g.gravidanze[0].mammaId = 'nessuna';
    expect(errore(g)).toMatch(/mamma/);
    const i = valido();
    i.incontri[0].gravidanzaId = 'nessuna';
    expect(errore(i)).toMatch(/gravidanza/);
  });

  it('imports a pre-v1.2 backup: DPP eco becomes a corrected UPM, old tipi are mapped', () => {
    const b = valido() as unknown as { gravidanze: Record<string, unknown>[]; incontri: Record<string, unknown>[] };
    b.gravidanze[0].dppEco = '2026-12-10';
    b.incontri[0].tipo = 'controllo';
    const r = validateBackup(b);
    if (!r.ok) throw new Error(r.errore);
    expect(r.backup.gravidanze[0]).toMatchObject({ upm: '2026-03-05', upmEco: true });
    expect(r.backup.gravidanze[0]).not.toHaveProperty('dppEco');
    expect(r.backup.incontri[0]).toMatchObject({ tipo: 'gravidanza', visita: 'controllo' });
  });

  it('accepts a valid backup and summarises it', () => {
    const r = validateBackup(valido());
    expect(r).toEqual({
      ok: true,
      backup: valido(),
      riepilogo: { mamme: 1, incontri: 1, esportatoIl: '2026-11-17T09:00:00.000Z' }
    });
  });

  it('backupFilename', () => {
    expect(backupFilename('2026-11-17')).toBe('ostetrixie-backup-2026-11-17.json');
  });

  it('segnaBackupFatto stores the timestamp and keeps the other settings', async () => {
    await db.impostazioni.put({ id: 'main', pinHash: 'h', pinSalt: 's', timeoutMinuti: 3 });
    await segnaBackupFatto(new Date('2026-11-17T10:00:00.000Z'));
    expect(await getImpostazioni()).toEqual({
      id: 'main',
      pinHash: 'h',
      pinSalt: 's',
      timeoutMinuti: 3,
      ultimoBackup: '2026-11-17T10:00:00.000Z'
    });
  });

  it('segnaBackupFatto works with no stored settings', async () => {
    await segnaBackupFatto(new Date('2026-11-17T10:00:00.000Z'));
    expect(await getImpostazioni()).toEqual({
      id: 'main',
      timeoutMinuti: 5,
      ultimoBackup: '2026-11-17T10:00:00.000Z'
    });
  });

  it('descriviUltimoBackup', () => {
    const at = (d: string) => new Date(`${d}T12:00:00`).toISOString();
    expect(descriviUltimoBackup(undefined, '2026-11-17')).toBe('mai');
    expect(descriviUltimoBackup(at('2026-11-17'), '2026-11-17')).toBe('oggi');
    expect(descriviUltimoBackup(at('2026-11-16'), '2026-11-17')).toBe('ieri');
    expect(descriviUltimoBackup(at('2026-11-05'), '2026-11-17')).toBe('12 giorni fa');
  });
});

describe('condividiOScarica', () => {
  const nome = 'ostetrixie-backup-2026-11-17.json';
  let click: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    click = vi.fn();
    const a = { click, remove: vi.fn(), style: {} as Record<string, string> };
    vi.stubGlobal('document', { createElement: () => a, body: { append: vi.fn() } });
    vi.stubGlobal('URL', Object.assign(Object.create(URL), { createObjectURL: () => 'blob:x', revokeObjectURL: vi.fn() }));
  });
  afterEach(() => vi.unstubAllGlobals());

  const conShare = (share: () => Promise<void>) =>
    vi.stubGlobal('navigator', { share: vi.fn(share), canShare: () => true });

  it('shared file: fatto, no download', async () => {
    conShare(async () => {});
    expect(await condividiOScarica(valido(), nome)).toBe('fatto');
    expect(click).not.toHaveBeenCalled();
  });
  it('share sheet dismissed: annullato, no download', async () => {
    conShare(async () => { throw new DOMException('x', 'AbortError'); });
    expect(await condividiOScarica(valido(), nome)).toBe('annullato');
    expect(click).not.toHaveBeenCalled();
  });
  it('share refused for another reason: errore, no download outside the gesture', async () => {
    conShare(async () => { throw new DOMException('x', 'NotAllowedError'); });
    expect(await condividiOScarica(valido(), nome)).toBe('errore');
    expect(click).not.toHaveBeenCalled();
  });
  it('file sharing unsupported: downloads, fatto', async () => {
    vi.stubGlobal('navigator', {});
    expect(await condividiOScarica(valido(), nome)).toBe('fatto');
    expect(click).toHaveBeenCalledOnce();
  });
});
