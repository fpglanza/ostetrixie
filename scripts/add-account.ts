/**
 * npm run add-account: adds (or replaces) a login account in src/lib/accounts.json.
 * Asks for the username and the password (not echoed). Only the hash is saved.
 * Runs under plain Node with type stripping: Node >= 22.18 (see "engines" in package.json).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { aggiungi, creaAccount, normalizza, type Account } from '../src/lib/accounts.ts';

const FILE = new URL('../src/lib/accounts.json', import.meta.url);

// Echo goes through this stream, muted while a password is typed.
let muto = false;
const eco = new Writable({
  write(chunk, _enc, done) {
    if (!muto) stdout.write(chunk);
    done();
  },
});

const rl = createInterface({ input: stdin, output: eco, terminal: Boolean(stdin.isTTY) });
// Lines are read through one iterator (rl.question drops lines that arrive piped all at once).
const righe = rl[Symbol.asyncIterator]();

async function chiedi(domanda: string, nascosto = false): Promise<string> {
  // The question is readline's own prompt, so a redraw (e.g. after Backspace) repeats it
  // instead of readline's default "> ". A hidden field shows it once, then mutes the echo.
  rl.setPrompt(domanda);
  if (nascosto) stdout.write(domanda);
  else rl.prompt();
  muto = nascosto;
  try {
    const r = await righe.next();
    if (r.done) throw new Error('Input terminato.');
    return r.value;
  } finally {
    muto = false;
    if (nascosto) stdout.write('\n');
  }
}

try {
  const username = normalizza(await chiedi('Nome utente: '));
  if (!username) throw new Error('Il nome utente non può essere vuoto.');
  const password = await chiedi('Password: ', true);
  if (password.length < 8) throw new Error('La password deve avere almeno 8 caratteri.');
  if ((await chiedi('Ripeti la password: ', true)) !== password) throw new Error('Le password non coincidono.');

  const lista = JSON.parse(readFileSync(FILE, 'utf8')) as Account[];
  const esisteva = lista.some((a) => a.username === username);
  writeFileSync(FILE, JSON.stringify(aggiungi(lista, await creaAccount(username, password)), null, 2) + '\n');
  console.log(`Account "${username}" ${esisteva ? 'aggiornato' : 'salvato'}. Fai commit e push per pubblicarlo.`);
} catch (e) {
  console.error((e as Error).message);
  process.exitCode = 1;
} finally {
  rl.close();
}
