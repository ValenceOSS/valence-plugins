import { aHost } from '@Shared/testing/aHost';
import { aMedia } from '@Shared/testing/aMedia';
import type { AnimeEntry } from './AnimeEntry';
import { findSeriesFor } from './findSeriesFor';

const entry: AnimeEntry = {
  provider: 'anilist',
  id: '154587',
  anilistId: '154587',
  malId: '52991',
  titles: ['Frieren: Beyond Journey’s End', 'Sousou no Frieren'],
  year: 2023,
  progress: 3,
  episodes: 28,
  status: 'watching',
};

describe('findSeriesFor', () => {
  it('finds a programme by its AniList or MyAnimeList id first', async () => {
    const { host } = aHost({
      library: [aMedia({ id: 's1', title: 'Something else', externalIds: { mal: '52991' } })],
    });

    expect((await findSeriesFor(host, entry))?.id).toBe('s1');
  });

  it('falls back to one exact title in a year close enough', async () => {
    const { host } = aHost({
      library: [
        aMedia({ id: 's1', title: 'Frieren: Beyond Journey’s End', year: 2024 }),
        aMedia({ id: 's2', title: 'Frieren: Beyond Journey’s End (Recap)', year: 2023 }),
      ],
    });

    expect((await findSeriesFor(host, { ...entry, anilistId: null, malId: null }))?.id).toBe('s1');
  });

  it('matches nothing when the year is too far out or two titles match', async () => {
    const far = aHost({ library: [aMedia({ id: 's1', title: 'Sousou no Frieren', year: 2019 })] });
    const twice = aHost({
      library: [
        aMedia({ id: 's1', title: 'Sousou no Frieren', year: 2023 }),
        aMedia({ id: 's2', title: 'Sousou no Frieren', year: null }),
      ],
    });
    const plain = { ...entry, anilistId: null, malId: null };

    expect(await findSeriesFor(far.host, plain)).toBeNull();
    expect(await findSeriesFor(twice.host, plain)).toBeNull();
  });
});
