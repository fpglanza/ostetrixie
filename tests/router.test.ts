import { describe, it, expect } from 'vitest';
import { matchRoute } from '../src/lib/routes';

describe('matchRoute', () => {
  it('maps a mamma id to the scheda', () => {
    expect(matchRoute('#/mamma/abc')).toEqual({ name: 'scheda', params: { id: 'abc' } });
  });

  it('falls back to mamme for unknown or empty paths', () => {
    expect(matchRoute('#/boh/1/2')).toEqual({ name: 'mamme', params: {} });
    expect(matchRoute('')).toEqual({ name: 'mamme', params: {} });
    expect(matchRoute('#/')).toEqual({ name: 'mamme', params: {} });
  });

  it('matches every named route', () => {
    expect(matchRoute('#/mamma/nuova')).toEqual({ name: 'mammaNuova', params: {} });
    expect(matchRoute('#/mamma/abc/modifica')).toEqual({ name: 'mammaModifica', params: { id: 'abc' } });
    expect(matchRoute('#/gravidanza/g1/incontro/nuovo')).toEqual({ name: 'incontroNuovo', params: { gid: 'g1' } });
    expect(matchRoute('#/incontro/i1')).toEqual({ name: 'incontro', params: { id: 'i1' } });
    expect(matchRoute('#/calendario')).toEqual({ name: 'calendario', params: {} });
    expect(matchRoute('#/impostazioni')).toEqual({ name: 'impostazioni', params: {} });
    expect(matchRoute('#/aiuto')).toEqual({ name: 'aiuto', params: {} });
  });

  it('decodes params and ignores a trailing slash', () => {
    expect(matchRoute('#/mamma/a%20b/')).toEqual({ name: 'scheda', params: { id: 'a b' } });
  });
});
