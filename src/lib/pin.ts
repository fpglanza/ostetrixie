/**
 * PIN hashing. The PIN is an access barrier, not encryption: the data in IndexedDB stay
 * readable to anyone with the unlocked device. PBKDF2 makes a stolen hash slow to brute-force.
 */
const ITERAZIONI = 210_000;
const BYTE_CHIAVE = 32;
const BYTE_SALE = 16;

const aBase64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));
const daBase64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function deriva(pin: string, salt: Uint8Array): Promise<Uint8Array> {
  const chiave = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations: ITERAZIONI },
    chiave,
    BYTE_CHIAVE * 8
  );
  return new Uint8Array(bits);
}

export function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

export async function hashPin(pin: string, salt?: Uint8Array): Promise<{ hash: string; salt: string }> {
  const sale = salt ?? crypto.getRandomValues(new Uint8Array(BYTE_SALE));
  return { hash: aBase64(await deriva(pin, sale)), salt: aBase64(sale) };
}

export async function verifyPin(pin: string, hash: string, salt: string): Promise<boolean> {
  let atteso: Uint8Array;
  let sale: Uint8Array;
  try {
    atteso = daBase64(hash);
    sale = daBase64(salt);
  } catch {
    return false;
  }
  const calcolato = await deriva(pin, sale);
  // Compare every byte, without an early exit.
  let diff = atteso.length ^ calcolato.length;
  for (let i = 0; i < calcolato.length; i++) diff |= calcolato[i] ^ (atteso[i] ?? 0);
  return diff === 0;
}
