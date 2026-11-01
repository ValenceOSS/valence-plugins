import { aHost } from '@Shared/testing/aHost';
import { aMedia } from '@Shared/testing/aMedia';
import { itemsFrom } from './itemsFrom';
import { randomItems } from './randomItems';

const SONGS = Array.from({ length: 3000 }, (_, at) =>
  aMedia({
    id: `t${at.toString().padStart(4, '0')}`,
    kind: 'track',
    title: `Song ${at.toString().padStart(4, '0')}`,
  }),
);

describe('randomItems', () => {
  it('picks as many as asked, each once', async () => {
    const { host } = aHost({ library: SONGS });
    const picked = await randomItems(host, 'p1', 'track', 50);

    expect(picked).toHaveLength(50);
    expect(new Set(picked.map((song) => song.id)).size).toBe(50);
  });

  it('reaches past the first pages once more of the library is known', async () => {
    const { host } = aHost({ library: SONGS });

    await itemsFrom(host, 'p2', 'track', 0, 3000);
    vi.spyOn(Math, 'random').mockReturnValue(0.99);

    try {
      const picked = await randomItems(host, 'p2', 'track', 10);

      expect(picked.every((song) => song.id >= 't2800')).toBe(true);
    } finally {
      vi.restoreAllMocks();
    }
  });
});
