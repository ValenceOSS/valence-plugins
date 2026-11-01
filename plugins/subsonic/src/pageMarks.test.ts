import { pageMarks } from './pageMarks';

describe('pageMarks', () => {
  it('keeps each person’s marks apart, and forgets them after ten minutes', () => {
    const mine = pageMarks('p1', 'track', 0);

    mine.push('m1');

    expect(pageMarks('p1', 'track', 60_000)).toEqual([null, 'm1']);
    expect(pageMarks('p2', 'track', 60_000)).toEqual([null]);
    expect(pageMarks('p1', 'album', 60_000)).toEqual([null]);
    expect(pageMarks('p1', 'track', 11 * 60_000)).toEqual([null]);
  });
});
