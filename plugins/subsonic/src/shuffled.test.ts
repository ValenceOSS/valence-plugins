import { shuffled } from './shuffled';

describe('shuffled', () => {
  it('gives back the same things in a new list', () => {
    const items = [1, 2, 3, 4, 5];
    const copy = shuffled(items);

    expect(copy).not.toBe(items);
    expect(copy.toSorted((a, b) => a - b)).toEqual(items);
  });
});
