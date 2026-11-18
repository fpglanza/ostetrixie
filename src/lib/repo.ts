import { db } from './db';
import type { Gravidanza, Incontro, Mamma } from './types';

type Meta = 'id' | 'createdAt' | 'updatedAt';
export type MammaInput = Omit<Mamma, Meta>;
export type GravidanzaInput = Omit<Gravidanza, Meta | 'mammaId' | 'stato'> &
  Partial<Pick<Gravidanza, 'stato'>>;
export type IncontroInput = Omit<Incontro, Meta>;

let lastStamp = 0;
/** ISO timestamp, strictly increasing within this session. */
function now(): string {
  lastStamp = Math.max(Date.now(), lastStamp + 1);
  return new Date(lastStamp).toISOString();
}

const newId = () => crypto.randomUUID();

export async function createMamma(
  m: MammaInput,
  g: GravidanzaInput
): Promise<{ mamma: Mamma; gravidanza: Gravidanza }> {
  const t = now();
  const mamma: Mamma = { ...m, id: newId(), createdAt: t, updatedAt: t };
  const gravidanza: Gravidanza = {
    ...g,
    id: newId(),
    mammaId: mamma.id,
    stato: 'in_corso',
    createdAt: t,
    updatedAt: t
  };
  await db.transaction('rw', db.mamme, db.gravidanze, async () => {
    await db.mamme.add(mamma);
    await db.gravidanze.add(gravidanza);
  });
  return { mamma, gravidanza };
}

export async function updateMamma(id: string, patch: Partial<MammaInput>): Promise<Mamma> {
  return db.transaction('rw', db.mamme, async () => {
    const cur = await db.mamme.get(id);
    if (!cur) throw new Error(`Mamma non trovata: ${id}`);
    const next: Mamma = { ...cur, ...patch, id, updatedAt: now() };
    await db.mamme.put(next);
    return next;
  });
}

export async function updateGravidanza(
  id: string,
  patch: Partial<GravidanzaInput>
): Promise<Gravidanza> {
  return db.transaction('rw', db.gravidanze, async () => {
    const cur = await db.gravidanze.get(id);
    if (!cur) throw new Error(`Gravidanza non trovata: ${id}`);
    const next: Gravidanza = { ...cur, ...patch, id, updatedAt: now() };
    if (patch.dataParto) next.stato = 'conclusa';
    await db.gravidanze.put(next);
    return next;
  });
}

/** Starts a new pregnancy; any in_corso one is closed (conclusa, no birth date) in the same transaction. */
export async function nuovaGravidanza(mammaId: string, g: GravidanzaInput): Promise<Gravidanza> {
  return db.transaction('rw', db.gravidanze, async () => {
    const t = now();
    const aperte = await db.gravidanze
      .where('mammaId')
      .equals(mammaId)
      .filter((x) => x.stato === 'in_corso')
      .toArray();
    for (const x of aperte) await db.gravidanze.put({ ...x, stato: 'conclusa', updatedAt: t });
    const tNuova = now(); // strictly after t, so the new one sorts newest
    const gravidanza: Gravidanza = {
      ...g,
      id: newId(),
      mammaId,
      stato: 'in_corso',
      createdAt: tNuova,
      updatedAt: tNuova
    };
    await db.gravidanze.add(gravidanza);
    return gravidanza;
  });
}

export async function deleteMamma(id: string): Promise<void> {
  await db.transaction('rw', db.mamme, db.gravidanze, db.incontri, async () => {
    const gids = await db.gravidanze.where('mammaId').equals(id).primaryKeys();
    await db.incontri.where('gravidanzaId').anyOf(gids).delete();
    await db.gravidanze.bulkDelete(gids);
    await db.mamme.delete(id);
  });
}

export async function saveIncontro(i: IncontroInput & { id?: string }): Promise<Incontro> {
  return db.transaction('rw', db.incontri, async () => {
    const existing = i.id ? await db.incontri.get(i.id) : undefined;
    const t = now();
    const next: Incontro = {
      ...i,
      id: existing?.id ?? i.id ?? newId(),
      createdAt: existing?.createdAt ?? t,
      updatedAt: t
    } as Incontro;
    await db.incontri.put(next);
    return next;
  });
}

export async function deleteIncontro(id: string): Promise<void> {
  await db.incontri.delete(id);
}

export async function copiaIncontro(
  sourceId: string,
  gravidanzaIds: string[]
): Promise<Incontro[]> {
  return db.transaction('rw', db.incontri, async () => {
    const src = await db.incontri.get(sourceId);
    if (!src) throw new Error(`Incontro non trovato: ${sourceId}`);
    const t = now();
    const copies: Incontro[] = gravidanzaIds.map((gravidanzaId) => ({
      id: newId(),
      gravidanzaId,
      data: src.data,
      ora: src.ora,
      tipo: src.tipo,
      stato: src.stato,
      argomento: src.argomento,
      attivita: src.attivita,
      partnerPresente: 'nd',
      createdAt: t,
      updatedAt: t
    }));
    await db.incontri.bulkAdd(copies);
    return copies;
  });
}

export async function getMammaDetail(id: string): Promise<{
  mamma: Mamma;
  gravidanze: Gravidanza[];
  incontriByGravidanza: Record<string, Incontro[]>;
} | null> {
  const mamma = await db.mamme.get(id);
  if (!mamma) return null;
  const gravidanze = (await db.gravidanze.where('mammaId').equals(id).toArray()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
  const incontriByGravidanza: Record<string, Incontro[]> = {};
  for (const g of gravidanze) {
    incontriByGravidanza[g.id] = (
      await db.incontri.where('gravidanzaId').equals(g.id).toArray()
    ).sort((a, b) => b.data.localeCompare(a.data) || (b.ora ?? '').localeCompare(a.ora ?? ''));
  }
  return { mamma, gravidanze, incontriByGravidanza };
}

export async function getAllData(): Promise<{
  mamme: Mamma[];
  gravidanze: Gravidanza[];
  incontri: Incontro[];
}> {
  const [mamme, gravidanze, incontri] = await Promise.all([
    db.mamme.toArray(),
    db.gravidanze.toArray(),
    db.incontri.toArray()
  ]);
  return { mamme, gravidanze, incontri };
}

/** A pregnancy with its mamma, or null when either is missing. */
export async function getGravidanzaContext(
  gid: string,
): Promise<{ gravidanza: Gravidanza; mamma: Mamma } | null> {
  const gravidanza = await db.gravidanze.get(gid);
  const mamma = gravidanza && (await db.mamme.get(gravidanza.mammaId));
  return gravidanza && mamma ? { gravidanza, mamma } : null;
}

/** An incontro with the pregnancy and mamma it belongs to, or null when any is missing. */
export async function getIncontroContext(
  id: string,
): Promise<{ incontro: Incontro; gravidanza: Gravidanza; mamma: Mamma } | null> {
  const incontro = await db.incontri.get(id);
  const ctx = incontro && (await getGravidanzaContext(incontro.gravidanzaId));
  return incontro && ctx ? { incontro, ...ctx } : null;
}
