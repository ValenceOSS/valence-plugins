import { aHost } from '@Shared/testing/aHost';
import { readMalEntries } from './readMalEntries';

const page = (id: number, next?: string) => ({
  data: [
    {
      node: {
        id,
        title: 'Sousou no Frieren',
        num_episodes: id === 1 ? 0 : 28,
        start_season: { year: 2023 },
        alternative_titles: { en: 'Frieren', synonyms: [] },
      },
      list_status: { status: 'on_hold', num_episodes_watched: 5, is_rewatching: id === 2 },
    },
  ],
  ...(next === undefined ? {} : { paging: { next } }),
});

describe('readMalEntries', () => {
  it('follows the pages of a list', async () => {
    const { host } = aHost({
      answers: (url) =>
        url.includes('offset')
          ? { status: 200, text: JSON.stringify(page(2)) }
          : {
              status: 200,
              text: JSON.stringify(
                page(1, 'https://api.myanimelist.net/v2/users/@me/animelist?offset=1000'),
              ),
            },
    });
    const entries = await readMalEntries(host, 'token');

    expect(entries.map((entry) => [entry.id, entry.status, entry.episodes])).toEqual([
      ['1', 'paused', null],
      ['2', 'repeating', 28],
    ]);
    expect(entries[0]?.titles).toEqual(['Frieren', 'Sousou no Frieren']);
  });
});
