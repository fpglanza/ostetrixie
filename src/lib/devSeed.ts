// DEV ONLY — sample caseload from the orario.html sketch. Delete this file to remove it.
import { todayISO } from './dates';
import { createMamma, saveIncontro, updateGravidanza } from './repo';
import type { Incontro } from './types';

type Prog = Pick<Incontro, 'data' | 'tipo'> & { ora?: string };

async function add(nome: string, cognome: string, upm: string, prog: Prog, dataParto?: string) {
  const { gravidanza } = await createMamma({ nome, cognome, archiviata: false }, { upm });
  if (dataParto) await updateGravidanza(gravidanza.id, { dataParto });
  await saveIncontro({ gravidanzaId: gravidanza.id, stato: 'programmato', partnerPresente: 'nd', ...prog });
}

export async function seedDemo(): Promise<void> {
  await add('Giulia', 'Esposito', '2026-02-16', { data: todayISO(), ora: '15:30', tipo: 'gravidanza' });
  await add('Carmela', 'Rossi', '2026-03-20', { data: '2026-11-20', tipo: 'gravidanza' });
  await add('Marta', 'Ferri', '2026-06-16', { data: '2026-11-10', tipo: 'gravidanza' });
  await add('Pina', 'Bianchi', '2026-08-06', { data: '2026-11-30', tipo: 'gravidanza' });
  await add('Anna', 'Verdi', '2026-01-20', { data: '2026-11-26', tipo: 'puerperio' }, '2026-10-27');
}
