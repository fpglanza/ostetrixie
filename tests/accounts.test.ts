import { describe, expect, it } from 'vitest';
import { aggiungi, creaAccount, verificaCredenziali } from '../src/lib/accounts';

describe('verificaCredenziali', () => {
  it('accetta credenziali giuste', async () => {
    const lista = [await creaAccount('sofi', 'gatto-blu-42')];
    expect(await verificaCredenziali('sofi', 'gatto-blu-42', lista)).toBe(true);
  });

  it('ignora maiuscole e spazi nel nome', async () => {
    const lista = [await creaAccount('Sofi', 'gatto-blu-42')];
    expect(lista[0].username).toBe('sofi');
    expect(await verificaCredenziali('  SOFI ', 'gatto-blu-42', lista)).toBe(true);
  });

  it('rifiuta password sbagliata o nome sconosciuto', async () => {
    const lista = [await creaAccount('sofi', 'gatto-blu-42')];
    expect(await verificaCredenziali('sofi', 'gatto-blu-43', lista)).toBe(false);
    expect(await verificaCredenziali('pina', 'gatto-blu-42', lista)).toBe(false);
  });

  it('rifiuta con lista vuota o campi vuoti', async () => {
    expect(await verificaCredenziali('sofi', 'x', [])).toBe(false);
    const lista = [await creaAccount('sofi', 'gatto-blu-42')];
    expect(await verificaCredenziali('', '', lista)).toBe(false);
  });

  it('non salva la password in chiaro', async () => {
    const a = await creaAccount('sofi', 'gatto-blu-42');
    expect(JSON.stringify(a)).not.toContain('gatto-blu-42');
  });
});

describe('aggiungi', () => {
  it('aggiunge un nuovo account', async () => {
    const a = await creaAccount('sofi', 'uno');
    const b = await creaAccount('pina', 'due');
    expect(aggiungi([a], b).map((x) => x.username)).toEqual(['sofi', 'pina']);
  });

  it('sostituisce lo stesso nome invece di duplicarlo', async () => {
    const vecchio = await creaAccount('sofi', 'vecchia');
    const nuovo = await creaAccount('SOFI', 'nuova');
    const lista = aggiungi([vecchio], nuovo);
    expect(lista).toHaveLength(1);
    expect(await verificaCredenziali('sofi', 'nuova', lista)).toBe(true);
    expect(await verificaCredenziali('sofi', 'vecchia', lista)).toBe(false);
  });
});
