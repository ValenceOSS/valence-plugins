import { aHost } from '@Shared/testing/aHost';
import { aMedia } from '@Shared/testing/aMedia';
import type { AnimeEntry } from './AnimeEntry';
import { findSeriesFor } from './findSeriesFor';

const entry: AnimeEntry = {
  provider: 'anilist',
  id: '1001',
  anilistId: '1001',
  malId: '2001',
  titles: ['Example Quest', 'Rei no Bouken'],
  year: 2023,
  progress: 3,
  episodes: 28,
  status: 'watching',
};

describe('findSeriesFor', () => {
  it('finds a programme by its AniList or MyAnimeList id first', async () => {
    const { host } = aHost({
      library: [aMedia({ id: 's1', title: 'Something else', externalIds: { mal: '2001' } })],
    });

    expect((await findSeriesFor(host, 'p1', entry))?.id).toBe('s1');
  });

  it('falls back to one exact title in a year close enough', async () => {
    const { host } = aHost({
      library: [
        aMedia({ id: 's1', title: 'Example Quest', year: 2024 }),
        aMedia({ id: 's2', title: 'Example Quest (Recap)', year: 2023 }),
      ],
    });

    expect((await findSeriesFor(host, 'p1', { ...entry, anilistId: null, malId: null }))?.id).toBe(
      's1',
    );
  });

  it('matches nothing when the year is too far out or two titles match', async () => {
    const far = aHost({ library: [aMedia({ id: 's1', title: 'Rei no Bouken', year: 2019 })] });
    const twice = aHost({
      library: [
        aMedia({ id: 's1', title: 'Rei no Bouken', year: 2023 }),
        aMedia({ id: 's2', title: 'Rei no Bouken', year: null }),
      ],
    });
    const plain = { ...entry, anilistId: null, malId: null };

    expect(await findSeriesFor(far.host, 'p1', plain)).toBeNull();
    expect(await findSeriesFor(twice.host, 'p1', plain)).toBeNull();
  });

  it('never asks the library to search for a title it would refuse', async () => {
    const { host } = aHost({ library: [aMedia({ id: 's1', title: 'Example Quest', year: 2023 })] });

    expect(
      await findSeriesFor(host, 'p1', {
        ...entry,
        anilistId: null,
        malId: null,
        titles: [' ', 'x'.repeat(201), 'Example Quest'],
      }),
    ).toMatchObject({ id: 's1' });
    expect(host.library.search.mock.calls.map(([title]) => title)).toEqual(['Example Quest']);
  });
});
