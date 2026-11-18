import { describe, expect, it } from 'vitest';
import { attesaDopoErrore, shouldLock } from '../src/lib/lockPolicy';

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
