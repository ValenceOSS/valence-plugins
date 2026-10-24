import { aMedia } from '@Shared/testing/aMedia';
import { positionsOf } from './positionsOf';

const episode = (season: number, number: number) =>
  aMedia({
    id: `s${season.toString()}e${number.toString()}`,
    title: 'Episode',
    kind: 'episode',
    seriesId: 'x',
    seasonNumber: season,
    episodeNumber: number,
  });

describe('positionsOf', () => {
  it('counts across seasons by episode number, leaving out specials', () => {
    expect(positionsOf([episode(2, 1), episode(1, 2), episode(1, 1), episode(0, 1)])).toEqual({
      at: new Map([
        ['s2e1', 2],
        ['s1e2', 1],
        ['s1e1', 0],
      ]),
      starts: [0, 2],
    });
  });

  it('is not shifted by a missing file, and leaves out seasons after a missing one', () => {
    expect(positionsOf([episode(1, 1), episode(1, 3), episode(2, 1)]).at.get('s2e1')).toBe(3);
    expect(positionsOf([episode(2, 1), episode(3, 1)]).at.size).toBe(0);
  });

  it('counts a season numbered across the whole show as it is numbered', () => {
    const { at, starts } = positionsOf([
      episode(1, 1),
      episode(1, 12),
      episode(2, 13),
      episode(2, 14),
    ]);

    expect(at.get('s2e13')).toBe(12);
    expect(starts).toEqual([0, 12]);
  });
});
