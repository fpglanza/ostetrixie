/**
 * Accounts for the login gate. The gate is for show: the list is public in the repo
 * (hashes only, never passwords) and the check runs in the browser, so anyone technical
 * can skip it. The real protections stay local-only data and the PIN.
 *
 * Imports use the `.ts` extension so `scripts/add-account.ts` can run under plain Node.
 */
import { hashPin, verifyPin } from './pin.ts';

export type Account = { username: string; hash: string; salt: string };

export const normalizza = (username: string) => username.trim().toLowerCase();

/** Hashes with the PIN's PBKDF2 (same parameters), so a stolen list is slow to brute-force. */
export async function creaAccount(username: string, password: string): Promise<Account> {
  return { username: normalizza(username), ...(await hashPin(password)) };
}

/** Adds `account`, replacing any entry with the same (normalized) username. */
export function aggiungi(lista: Account[], account: Account): Account[] {
  return [...lista.filter((a) => a.username !== account.username), account];
}

export async function verificaCredenziali(username: string, password: string, lista: Account[]): Promise<boolean> {
  const a = lista.find((x) => x.username === normalizza(username));
  if (!a || !password) return false;
  return verifyPin(password, a.hash, a.salt);
}
