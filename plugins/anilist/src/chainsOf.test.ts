import { aHost } from '@Shared/testing/aHost';
import type { AnimeEntry } from './AnimeEntry';
import { chainsOf } from './chainsOf';
import { aniListAnswers } from './testing/aniListAnswers';

const anEntry = (changes: Partial<AnimeEntry>): AnimeEntry => ({
  provider: 'anilist',
  id: '1002',
  anilistId: '1002',
  malId: '2002',
  titles: ['Example Quest 2'],
  year: 2024,
  progress: 1,
  episodes: 12,
  status: 'watching',
  ...changes,
});

describe('chainsOf', () => {
  it('lists each entry’s seasons back to the first, asking AniList about them together', async () => {
    const { host } = aHost({ answers: aniListAnswers([]) });
    const chains = await chainsOf(host, [
      anEntry({}),
      anEntry({ id: '1001', anilistId: '1001', malId: '2001', titles: ['Example Quest'] }),
    ]);

    expect(chains.get('anilist:1002')?.map((season) => season.anilistId)).toEqual(['1002', '1001']);
    expect(chains.get('anilist:1001')?.map((season) => season.anilistId)).toEqual(['1001']);
    expect(host.http.fetch).toHaveBeenCalledTimes(1);
  });

  it('finds an entry only on MyAnimeList through AniList, and keeps the chain for next time', async () => {
    const { host, stored } = aHost({ answers: aniListAnswers([]) });

    await chainsOf(host, [anEntry({ provider: 'mal', id: '2002', anilistId: null })]);

    expect(stored.get('chain:mal:2002')).toMatchObject([
      { anilistId: '1002' },
      { anilistId: '1001' },
    ]);

    host.http.fetch.mockClear();

    expect(
      (await chainsOf(host, [anEntry({ provider: 'mal', id: '2002', anilistId: null })])).get(
        'mal:2002',
      ),
    ).toHaveLength(2);
    expect(host.http.fetch).not.toHaveBeenCalled();
  });

  it('prefers a television prequel to a short made for the web, and keeps nothing it can’t count', async () => {
    const { host, stored } = aHost({
      answers: aniListAnswers([], {
        seasons: [
          { id: 1000, idMal: null, episodes: null, format: 'ONA' },
          { id: 1001, idMal: 2001, episodes: null, format: 'TV', prequel: 1000 },
          { id: 1002, idMal: 2002, episodes: 12, format: 'TV', prequel: 1001 },
        ],
      }),
    });
    const chains = await chainsOf(host, [anEntry({}), anEntry({ id: '9', anilistId: '9' })]);

    expect(chains.get('anilist:1002')?.map((season) => season.anilistId)).toEqual([
      '1002',
      '1001',
      '1000',
    ]);
    expect(chains.has('anilist:9')).toBe(false);
    expect(stored.has('chain:anilist:1002')).toBe(false);
  });
});
