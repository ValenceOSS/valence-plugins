import { aHost } from '@Shared/testing/aHost';
import { aMedia } from '@Shared/testing/aMedia';
import { itemsFrom } from './itemsFrom';

const SONGS = Array.from({ length: 450 }, (_, at) =>
  aMedia({
    id: `t${at.toString().padStart(3, '0')}`,
    kind: 'track',
    title: `Song ${at.toString().padStart(3, '0')}`,
  }),
);

describe('itemsFrom', () => {
  it('reads from any offset, as the person reading', async () => {
    const { host } = aHost({ library: SONGS });

    expect((await itemsFrom(host, 'p1', 'track', 0, 3)).map((song) => song.id)).toEqual([
      't000',
      't001',
      't002',
    ]);
    expect((await itemsFrom(host, 'p1', 'track', 398, 4)).map((song) => song.id)).toEqual([
      't398',
      't399',
      't400',
      't401',
    ]);
    expect(await itemsFrom(host, 'p1', 'track', 449, 10)).toHaveLength(1);
    expect(await itemsFrom(host, 'p1', 'track', 500, 10)).toEqual([]);
    expect(host.library.list).toHaveBeenCalledWith(
      { kind: 'track', limit: 200 },
      { profileId: 'p1' },
    );
  });

  it('carries on from where the last page started rather than from the beginning', async () => {
    const { host } = aHost({ library: SONGS });

    await itemsFrom(host, 'p2', 'track', 0, 200);
    await itemsFrom(host, 'p2', 'track', 200, 200);
    vi.mocked(host.library.list).mockClear();
    await itemsFrom(host, 'p2', 'track', 400, 50);

    expect(host.library.list).toHaveBeenCalledTimes(1);
  });

  it('forgets where pages start after ten minutes, and learns them again', async () => {
    vi.useFakeTimers();

    try {
      const { host } = aHost({ library: SONGS });

      await itemsFrom(host, 'p3', 'track', 0, 450);
      vi.advanceTimersByTime(11 * 60_000);
      await itemsFrom(host, 'p3', 'track', 0, 450);
      vi.mocked(host.library.list).mockClear();
      await itemsFrom(host, 'p3', 'track', 400, 50);

      expect(host.library.list).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps only what was asked for when reading from far in', async () => {
    const { host } = aHost({ library: SONGS });

    expect((await itemsFrom(host, 'p4', 'track', 420, 5)).map((song) => song.id)).toEqual([
      't420',
      't421',
      't422',
      't423',
      't424',
    ]);
    expect(await itemsFrom(host, 'p4', 'track', 9_000_000_000, 5)).toEqual([]);
  });
});
