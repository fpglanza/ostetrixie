import { afterEach, describe, expect, it, vi } from 'vitest';

describe('accesso', () => {
  afterEach(() => {
    delete (globalThis as { localStorage?: unknown }).localStorage;
    vi.resetModules();
  });

  it('si carica anche se leggere localStorage lancia (sito con archiviazione bloccata)', async () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('blocked', 'SecurityError');
      }
    });
    const { accesso } = await import('../src/lib/accesso.svelte');
    expect(accesso.entrato).toBe(false);
  });

  it('ricorda un accesso salvato', async () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: { getItem: (k: string) => (k === 'ostetrixie.accesso' ? '1' : null), setItem() {} }
    });
    const { accesso } = await import('../src/lib/accesso.svelte');
    expect(accesso.entrato).toBe(true);
  });
});
