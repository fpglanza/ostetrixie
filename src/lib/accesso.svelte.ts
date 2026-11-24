import accounts from './accounts.json';
import { verificaCredenziali, type Account } from './accounts.ts';

const CHIAVE = 'ostetrixie.accesso';

function letto(): boolean {
  try {
    return localStorage.getItem(CHIAVE) === '1';
  } catch {
    return false;
  }
}

/**
 * Once-per-device login gate (for show, see accounts.ts). The flag lives in localStorage,
 * not IndexedDB, so "PIN dimenticato" (which wipes the data) doesn't ask for the login again.
 * If storage is unavailable the login simply holds for this session only.
 */
class Accesso {
  entrato = $state(typeof localStorage !== 'undefined' && letto());

  async entra(username: string, password: string): Promise<boolean> {
    if (!(await verificaCredenziali(username, password, accounts as Account[]))) return false;
    try {
      localStorage.setItem(CHIAVE, '1');
    } catch {
      /* private mode or blocked storage: signed in for this session only */
    }
    this.entrato = true;
    return true;
  }
}

export const accesso = new Accesso();
