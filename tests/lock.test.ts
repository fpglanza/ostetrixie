import { describe, expect, it } from 'vitest';
import {
  STATO_INIZIALE,
  attesaDopoErrore,
  contenutoVisibile,
  dopoErrore,
  dopoImpostazioni,
  dopoNascosto,
  dopoSblocco,
  dopoVisibile,
  shouldLock,
  verificaConFreno,
  type StatoLock
} from '../src/lib/lockPolicy';
import { hashPin } from '../src/lib/pin';

describe('shouldLock', () => {
  it('locks once the app was hidden longer than the timeout', () => {
    expect(shouldLock(0, 5 * 60_000 + 1, 5)).toBe(true);
    expect(shouldLock(1_000, 1_000 + 60_000 + 1, 1)).toBe(true);
  });
  it('does not lock within the timeout', () => {
    expect(shouldLock(0, 4 * 60_000, 5)).toBe(false);
    expect(shouldLock(0, 5 * 60_000, 5)).toBe(false);
  });
  it('does not lock when the app was never hidden', () => {
    expect(shouldLock(null, 10 * 60_000, 5)).toBe(false);
  });
});

describe('attesaDopoErrore', () => {
  it('imposes a 30 s wait on every 5th consecutive wrong PIN', () => {
    expect([1, 2, 3, 4].map(attesaDopoErrore)).toEqual([0, 0, 0, 0]);
    expect(attesaDopoErrore(5)).toBe(30_000);
    expect(attesaDopoErrore(6)).toBe(0);
    expect(attesaDopoErrore(10)).toBe(30_000);
  });
});

const CON_PIN = { pinHash: 'h', pinSalt: 's' };
const sbloccato = (): StatoLock => dopoSblocco(dopoImpostazioni(STATO_INIZIALE, CON_PIN));

describe('initial state from settings', () => {
  it('renders nothing before the settings are read', () => {
    expect(STATO_INIZIALE.pronto).toBe(false);
    expect(STATO_INIZIALE.locked).toBe(true);
    expect(STATO_INIZIALE.contenuto).toBe(false);
    expect(contenutoVisibile(STATO_INIZIALE)).toBe(false);
  });

  it('starts locked with no content mounted when a PIN exists', () => {
    const s = dopoImpostazioni(STATO_INIZIALE, CON_PIN);
    expect(s).toMatchObject({ pronto: true, locked: true, haPin: true, contenuto: false, errore: false });
    expect(contenutoVisibile(s)).toBe(false);
  });

  it('starts unlocked when there is no PIN', () => {
    const s = dopoImpostazioni(STATO_INIZIALE, {});
    expect(s).toMatchObject({ pronto: true, locked: false, haPin: false, contenuto: true });
    expect(contenutoVisibile(s)).toBe(true);
  });

  it('setting a PIN while unlocked does not lock; removing it unlocks', () => {
    const libero = dopoImpostazioni(STATO_INIZIALE, {});
    expect(dopoImpostazioni(libero, CON_PIN).locked).toBe(false);
    const bloccato = dopoImpostazioni(STATO_INIZIALE, CON_PIN);
    expect(dopoImpostazioni(bloccato, {}).locked).toBe(false);
  });
});

describe('settings read error', () => {
  it('fails closed at cold start: locked, error shown, no content', () => {
    const s = dopoErrore(STATO_INIZIALE);
    expect(s).toMatchObject({ pronto: true, locked: true, errore: true, contenuto: false });
    expect(contenutoVisibile(s)).toBe(false);
  });

  it('fails closed after start too, keeping content mounted (hidden)', () => {
    const s = dopoErrore(sbloccato());
    expect(s).toMatchObject({ locked: true, errore: true, contenuto: true });
    expect(contenutoVisibile(s)).toBe(false);
  });

  it('a successful retry decides afresh: PIN → lock screen, no PIN → content', () => {
    expect(dopoImpostazioni(dopoErrore(sbloccato()), CON_PIN)).toMatchObject({ errore: false, locked: true });
    expect(dopoImpostazioni(dopoErrore(STATO_INIZIALE), {})).toMatchObject({
      errore: false,
      locked: false,
      contenuto: true
    });
  });
});

describe('background cover and timeout', () => {
  it('covers the content as soon as the app is hidden, when a PIN is set', () => {
    const s = dopoNascosto(sbloccato());
    expect(s.coperto).toBe(true);
    expect(contenutoVisibile(s)).toBe(false);
    expect(dopoNascosto(dopoImpostazioni(STATO_INIZIALE, {})).coperto).toBe(false);
  });

  it('on return uncovers within the timeout, locks past it, keeping content mounted', () => {
    const coperto = dopoNascosto(sbloccato());
    const presto = dopoVisibile(coperto, 0, 60_000, 5);
    expect(presto).toMatchObject({ coperto: false, locked: false });
    expect(contenutoVisibile(presto)).toBe(true);
    const tardi = dopoVisibile(coperto, 0, 5 * 60_000 + 1, 5);
    expect(tardi).toMatchObject({ coperto: false, locked: true, contenuto: true });
  });
});

describe('verificaConFreno', () => {
  const libero = { errati: 0, attesaFino: 0 };

  it('never accepts a PIN when no hash is loaded', async () => {
    expect((await verificaConFreno('1234', undefined, undefined, libero, 0)).esito).toBe('errato');
    expect((await verificaConFreno('', undefined, 's', libero, 0)).esito).toBe('errato');
  });

  it('accepts the right PIN and resets the brake', async () => {
    const { hash, salt } = await hashPin('1234');
    const r = await verificaConFreno('1234', hash, salt, { errati: 3, attesaFino: 0 }, 0);
    expect(r).toEqual({ esito: 'ok', freno: { errati: 0, attesaFino: 0 } });
  });

  it('counts failures and starts the 30 s wait on the 5th', async () => {
    const { hash, salt } = await hashPin('1234');
    const r4 = await verificaConFreno('0000', hash, salt, { errati: 3, attesaFino: 0 }, 1_000);
    expect(r4).toEqual({ esito: 'errato', freno: { errati: 4, attesaFino: 0 } });
    const r5 = await verificaConFreno('0000', hash, salt, r4.freno, 1_000);
    expect(r5).toEqual({ esito: 'errato', freno: { errati: 5, attesaFino: 31_000 } });
    const dentro = await verificaConFreno('1234', hash, salt, r5.freno, 30_999);
    expect(dentro.esito).toBe('attendi');
    expect((await verificaConFreno('1234', hash, salt, r5.freno, 31_000)).esito).toBe('ok');
  });
});
