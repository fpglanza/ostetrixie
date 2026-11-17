import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, getImpostazioni } from '../src/lib/db';
import {
  copiaIncontro,
  createMamma,
  deleteIncontro,
  deleteMamma,
  getAllData,
  getGravidanzaContext,
  getIncontroContext,
  getMammaDetail,
  nuovaGravidanza,
  saveIncontro,
  updateGravidanza,
  updateMamma
} from '../src/lib/repo';

const incontroBase = {
  data: '2026-05-01',
  stato: 'fatto' as const,
  tipo: 'controllo' as const,
  partnerPresente: 'si' as const
};

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('repo', () => {
  it('createMamma creates mamma and an in_corso gravidanza', async () => {
    const { mamma } = await createMamma(
      { nome: 'Anna', archiviata: false },
      { upm: '2026-01-01' }
    );
    const detail = await getMammaDetail(mamma.id);
    expect(detail?.mamma.nome).toBe('Anna');
    expect(detail?.gravidanze).toHaveLength(1);
    expect(detail?.gravidanze[0].stato).toBe('in_corso');
  });

  it('getMammaDetail returns null for unknown id', async () => {
    expect(await getMammaDetail('nope')).toBeNull();
  });

  it('nuovaGravidanza closes the in_corso one without a birth date, leaving exactly one in_corso', async () => {
    const { mamma, gravidanza } = await createMamma({ nome: 'A', archiviata: false }, { upm: '2026-03-20' });
    const done = await nuovaGravidanza(mamma.id, { upm: '2025-01-01' });
    await updateGravidanza(done.id, { dataParto: '2025-10-01' });
    const g3 = await nuovaGravidanza(mamma.id, { upm: '2027-01-01' });
    const all = await db.gravidanze.where('mammaId').equals(mamma.id).toArray();
    const byId = Object.fromEntries(all.map((g) => [g.id, g]));
    expect(byId[gravidanza.id].stato).toBe('conclusa');
    expect(byId[gravidanza.id].dataParto).toBeUndefined();
    expect(byId[done.id]).toMatchObject({ stato: 'conclusa', dataParto: '2025-10-01' });
    expect(byId[g3.id].stato).toBe('in_corso');
    expect(all.filter((g) => g.stato === 'in_corso').map((g) => g.id)).toEqual([g3.id]);
  });

  it('nuovaGravidanza lists newest first', async () => {
    const { mamma, gravidanza } = await createMamma({ nome: 'A', archiviata: false }, {});
    const g2 = await nuovaGravidanza(mamma.id, { upm: '2027-01-01' });
    const detail = await getMammaDetail(mamma.id);
    expect(detail?.gravidanze.map((g) => g.id)).toEqual([g2.id, gravidanza.id]);
  });

  it('saveIncontro inserts then updates the same record with growing updatedAt', async () => {
    const { gravidanza } = await createMamma({ nome: 'A', archiviata: false }, {});
    const a = await saveIncontro({ ...incontroBase, gravidanzaId: gravidanza.id });
    const b = await saveIncontro({ ...a, argomento: 'x' });
    expect(b.id).toBe(a.id);
    expect(b.createdAt).toBe(a.createdAt);
    expect(b.updatedAt > a.updatedAt).toBe(true);
    expect(await db.incontri.count()).toBe(1);
    expect((await db.incontri.get(a.id))?.argomento).toBe('x');
  });

  it('incontri are grouped by gravidanza, date desc', async () => {
    const { mamma, gravidanza } = await createMamma({ nome: 'A', archiviata: false }, {});
    await saveIncontro({ ...incontroBase, gravidanzaId: gravidanza.id, data: '2026-03-01' });
    await saveIncontro({ ...incontroBase, gravidanzaId: gravidanza.id, data: '2026-06-01' });
    const detail = await getMammaDetail(mamma.id);
    expect(detail?.incontriByGravidanza[gravidanza.id].map((i) => i.data)).toEqual([
      '2026-06-01',
      '2026-03-01'
    ]);
  });

  it('deleteMamma cascades but keeps other mammas', async () => {
    const one = await createMamma({ nome: 'A', archiviata: false }, {});
    const two = await createMamma({ nome: 'B', archiviata: false }, {});
    await saveIncontro({ ...incontroBase, gravidanzaId: one.gravidanza.id });
    await saveIncontro({ ...incontroBase, gravidanzaId: two.gravidanza.id });
    await deleteMamma(one.mamma.id);
    const all = await getAllData();
    expect(all.mamme.map((m) => m.id)).toEqual([two.mamma.id]);
    expect(all.gravidanze.map((g) => g.id)).toEqual([two.gravidanza.id]);
    expect(all.incontri).toHaveLength(1);
    expect(all.incontri[0].gravidanzaId).toBe(two.gravidanza.id);
  });

  it('copiaIncontro copies to each gravidanza without measurements', async () => {
    const one = await createMamma({ nome: 'A', archiviata: false }, {});
    const two = await createMamma({ nome: 'B', archiviata: false }, {});
    const src = await saveIncontro({
      ...incontroBase,
      gravidanzaId: one.gravidanza.id,
      ora: '10:00',
      argomento: 'Corso',
      attivita: 'Respiro',
      sinfisiFondoCm: 30,
      note: 'privata'
    });
    const copies = await copiaIncontro(src.id, [one.gravidanza.id, two.gravidanza.id]);
    expect(copies).toHaveLength(2);
    for (const c of copies) {
      expect(c.id).not.toBe(src.id);
      expect(c.partnerPresente).toBe('nd');
      expect(c.sinfisiFondoCm).toBeUndefined();
      expect(c.note).toBeUndefined();
      expect(c.argomento).toBe('Corso');
      expect(c.attivita).toBe('Respiro');
      expect(c.ora).toBe('10:00');
      expect(c.data).toBe(src.data);
    }
    expect(await db.incontri.count()).toBe(3);
  });

  it('updateGravidanza with dataParto concludes it', async () => {
    const { gravidanza } = await createMamma({ nome: 'A', archiviata: false }, {});
    const g = await updateGravidanza(gravidanza.id, { dataParto: '2026-10-27' });
    expect(g.stato).toBe('conclusa');
    expect(g.updatedAt > gravidanza.updatedAt).toBe(true);
  });

  it('updateMamma patches and deleteIncontro removes', async () => {
    const { mamma, gravidanza } = await createMamma({ nome: 'A', archiviata: false }, {});
    const m = await updateMamma(mamma.id, { cognome: 'Rossi' });
    expect(m.cognome).toBe('Rossi');
    const i = await saveIncontro({ ...incontroBase, gravidanzaId: gravidanza.id });
    await deleteIncontro(i.id);
    expect(await db.incontri.count()).toBe(0);
  });

  it('getImpostazioni defaults on empty DB', async () => {
    expect(await getImpostazioni()).toEqual({ id: 'main', timeoutMinuti: 5 });
  });

  it('getIncontroContext returns the incontro with its gravidanza and mamma', async () => {
    const { mamma, gravidanza } = await createMamma({ nome: 'Anna', archiviata: false }, { upm: '2026-01-01' });
    const inc = await saveIncontro({ ...incontroBase, gravidanzaId: gravidanza.id });
    const ctx = await getIncontroContext(inc.id);
    expect(ctx?.incontro.id).toBe(inc.id);
    expect(ctx?.gravidanza.id).toBe(gravidanza.id);
    expect(ctx?.mamma.id).toBe(mamma.id);
    expect(await getIncontroContext('nope')).toBeNull();
  });

  it('getGravidanzaContext returns gravidanza and mamma, null when unknown', async () => {
    const { mamma, gravidanza } = await createMamma({ nome: 'Anna', archiviata: false }, {});
    const ctx = await getGravidanzaContext(gravidanza.id);
    expect(ctx?.mamma.id).toBe(mamma.id);
    expect(ctx?.gravidanza.id).toBe(gravidanza.id);
    expect(await getGravidanzaContext('nope')).toBeNull();
  });
});
