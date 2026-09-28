import { normaliseTitle } from './normaliseTitle';

describe('normaliseTitle', () => {
  it('drops case, accents, punctuation and a leading "the"', () => {
    expect(normaliseTitle('The Apothecary Diaries')).toBe('apothecary diaries');
    expect(normaliseTitle('Pokémon: Horizons!')).toBe('pokemon horizons');
    expect(normaliseTitle('Tom & Jerry')).toBe('tom and jerry');
  });
});
