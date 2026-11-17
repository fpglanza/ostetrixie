import { diffDays, isValidISODate, todayISO, type ISODate } from './dates';
import { db, getImpostazioni } from './db';
import { getAllData } from './repo';
import type { Gravidanza, Incontro, Mamma } from './types';

export interface Backup {
  formato: 'ostetrixie';
  versione: 1;
  esportatoIl: string;
  mamme: Mamma[];
  gravidanze: Gravidanza[];
  incontri: Incontro[];
}

export interface Riepilogo {
  mamme: number;
  incontri: number;
  esportatoIl: string;
}

export type EsitoValidazione =
  | { ok: true; backup: Backup; riepilogo: Riepilogo }
  | { ok: false; errore: string };

/** Snapshot of the clinical data. PIN and settings are deliberately not included. */
export async function buildBackup(): Promise<Backup> {
  const { mamme, gravidanze, incontri } = await getAllData();
  return { formato: 'ostetrixie', versione: 1, esportatoIl: new Date().toISOString(), mamme, gravidanze, incontri };
}

export function backupFilename(today: ISODate): string {
  return `ostetrixie-backup-${today}.json`;
}

// --- Validation -------------------------------------------------------------

/** Field kind: a JS type, a calendar date, or the allowed values of an enum. */
type Tipo = 'string' | 'number' | 'boolean' | 'data' | readonly string[];
type Campi = Record<string, [Tipo, 'obbligatorio'?]>;

const META: Campi = { id: ['string', 'obbligatorio'], createdAt: ['string', 'obbligatorio'], updatedAt: ['string', 'obbligatorio'] };

const TABELLE = {
  mamme: {
    nome: 'la mamma',
    campi: {
      ...META,
      nome: ['string', 'obbligatorio'],
      cognome: ['string'],
      telefono: ['string'],
      dataNascita: ['data'],
      anamnesi: ['string'],
      archiviata: ['boolean', 'obbligatorio'],
      note: ['string']
    } as Campi
  },
  gravidanze: {
    nome: 'la gravidanza',
    campi: {
      ...META,
      mammaId: ['string', 'obbligatorio'],
      upm: ['data'],
      dppEco: ['data'],
      stato: [['in_corso', 'conclusa'], 'obbligatorio'],
      dataParto: ['data'],
      anamnesiOstetrica: ['string'],
      note: ['string']
    } as Campi
  },
  incontri: {
    nome: "l'incontro",
    campi: {
      ...META,
      gravidanzaId: ['string', 'obbligatorio'],
      data: ['data', 'obbligatorio'],
      ora: ['string'],
      stato: [['programmato', 'fatto'], 'obbligatorio'],
      tipo: [['controllo', 'accompagnamento', 'puerperio', 'altro'], 'obbligatorio'],
      argomento: ['string'],
      partnerPresente: [['si', 'no', 'nd'], 'obbligatorio'],
      attivita: ['string'],
      sinfisiFondoCm: ['number'],
      pesoKg: ['number'],
      pressione: ['string'],
      bcf: ['string'],
      note: ['string']
    } as Campi
  }
} as const;

type NomeTabella = keyof typeof TABELLE;

class Invalido extends Error {}

const isObj = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x);

function controllaCampo(chi: string, campo: string, tipo: Tipo, v: unknown): void {
  const ok = Array.isArray(tipo)
    ? tipo.includes(v as string)
    : tipo === 'data'
      ? typeof v === 'string' && isValidISODate(v)
      : tipo === 'number'
        ? typeof v === 'number' && Number.isFinite(v)
        : typeof v === tipo;
  if (ok) return;
  if (tipo === 'data') throw new Invalido(`${chi} ha una data non valida in «${campo}» (${String(v)}).`);
  if (Array.isArray(tipo)) throw new Invalido(`${chi} ha un valore non ammesso in «${campo}» (${String(v)}).`);
  throw new Invalido(`${chi} ha un valore non valido in «${campo}».`);
}

function controllaTabella(raw: Record<string, unknown>, nome: NomeTabella): Record<string, unknown>[] {
  const righe = raw[nome];
  if (!Array.isArray(righe)) throw new Invalido(`manca l'elenco «${nome}».`);
  const { nome: etichetta, campi } = TABELLE[nome];
  const visti = new Set<string>();
  righe.forEach((r, i) => {
    const chi = `${etichetta} n. ${i + 1}`;
    if (!isObj(r)) throw new Invalido(`${chi} non è un record valido.`);
    for (const [campo, [tipo, obbl]] of Object.entries(campi)) {
      const v = r[campo];
      if (v === undefined || v === null) {
        if (obbl) throw new Invalido(`${chi} non ha il campo «${campo}».`);
        if (v === null) throw new Invalido(`${chi} ha un valore non valido in «${campo}».`);
        continue;
      }
      controllaCampo(chi, campo, tipo, v);
    }
    const id = r.id as string;
    if (visti.has(id)) throw new Invalido(`${chi} ha un id duplicato (${id}).`);
    visti.add(id);
  });
  return righe;
}

/** Checks an untrusted parsed JSON file. Nothing reaches the database or the UI unless this says ok. */
export function validateBackup(raw: unknown): EsitoValidazione {
  if (!isObj(raw) || raw.formato !== 'ostetrixie') {
    return { ok: false, errore: 'Questo file non è un backup di Ostetrixie.' };
  }
  if (typeof raw.versione === 'number' && raw.versione > 1) {
    return {
      ok: false,
      errore: "Questo backup viene da una versione più recente di Ostetrixie: aggiorna l'app e riprova."
    };
  }
  try {
    if (raw.versione !== 1) throw new Invalido('versione del backup non riconosciuta.');
    if (typeof raw.esportatoIl !== 'string' || Number.isNaN(Date.parse(raw.esportatoIl))) {
      throw new Invalido('manca la data di esportazione.');
    }
    const mamme = controllaTabella(raw, 'mamme');
    const gravidanze = controllaTabella(raw, 'gravidanze');
    const incontri = controllaTabella(raw, 'incontri');

    const idMamme = new Set(mamme.map((m) => m.id));
    gravidanze.forEach((g, i) => {
      if (!idMamme.has(g.mammaId)) throw new Invalido(`la gravidanza n. ${i + 1} si riferisce a una mamma che non c'è.`);
    });
    const idGravidanze = new Set(gravidanze.map((g) => g.id));
    incontri.forEach((x, i) => {
      if (!idGravidanze.has(x.gravidanzaId)) {
        throw new Invalido(`l'incontro n. ${i + 1} si riferisce a una gravidanza che non c'è.`);
      }
    });

    const backup: Backup = {
      formato: 'ostetrixie',
      versione: 1,
      esportatoIl: raw.esportatoIl,
      mamme: mamme as unknown as Mamma[],
      gravidanze: gravidanze as unknown as Gravidanza[],
      incontri: incontri as unknown as Incontro[]
    };
    return {
      ok: true,
      backup,
      riepilogo: { mamme: mamme.length, incontri: incontri.length, esportatoIl: raw.esportatoIl }
    };
  } catch (e) {
    if (e instanceof Invalido) return { ok: false, errore: `Il file non è valido: ${e.message}` };
    throw e;
  }
}

// --- Restore / bookkeeping --------------------------------------------------

/** Replaces all clinical data in one transaction: on any failure nothing changes. Settings are untouched. */
export async function restoreBackup(b: Backup): Promise<void> {
  await db.transaction('rw', db.mamme, db.gravidanze, db.incontri, async () => {
    await Promise.all([db.mamme.clear(), db.gravidanze.clear(), db.incontri.clear()]);
    await db.mamme.bulkAdd(b.mamme);
    await db.gravidanze.bulkAdd(b.gravidanze);
    await db.incontri.bulkAdd(b.incontri);
  });
}

export async function segnaBackupFatto(now: Date): Promise<void> {
  await db.transaction('rw', db.impostazioni, async () => {
    const cur = await getImpostazioni();
    await db.impostazioni.put({ ...cur, ultimoBackup: now.toISOString() });
  });
}

/** "mai", "oggi", "ieri", "12 giorni fa". */
export function descriviUltimoBackup(ultimoBackup: string | undefined, today: ISODate): string {
  if (!ultimoBackup) return 'mai';
  const giorni = diffDays(todayISO(new Date(ultimoBackup)), today);
  if (giorni <= 0) return 'oggi';
  if (giorni === 1) return 'ieri';
  return `${giorni} giorni fa`;
}

// --- Export -----------------------------------------------------------------

/**
 * Hands the file to the share sheet (iOS: "Salva su File", AirDrop…) or downloads it.
 * Call it straight from the tap handler with an already-built backup: on iOS the share
 * must start inside the user gesture, so nothing is awaited before `navigator.share`.
 * Resolves true when the file was handed over, false when the user cancelled the share.
 */
export async function condividiOScarica(b: Backup, filename: string): Promise<boolean> {
  const json = JSON.stringify(b, null, 2);
  const file = new File([json], filename, { type: 'application/json' });
  if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return true;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return false;
      // Share refused (e.g. gesture lost): fall back to a plain download.
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return true;
}
