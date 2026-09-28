import { aHost } from '@Shared/testing/aHost';
import { readAniListEntries } from './readAniListEntries';
import { aniListAnswers } from './testing/aniListAnswers';
import { anAniListEntry } from './testing/anAniListEntry';

describe('readAniListEntries', () => {
  it('reads the viewer’s list, asking as them', async () => {
    const { host } = aHost({ answers: aniListAnswers([anAniListEntry()]) });
    const entries = await readAniListEntries(host, 'token');

    expect(entries).toEqual([
      {
        provider: 'anilist',
        id: '154587',
        anilistId: '154587',
        malId: '52991',
        titles: ['Frieren: Beyond Journey’s End', 'Sousou no Frieren', 'Frieren'],
        year: 2023,
        progress: 3,
        episodes: 28,
        status: 'watching',
      },
    ]);
    expect(host.http.fetch).toHaveBeenCalledWith(
      'https://graphql.anilist.co',
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: 'Bearer token' }),
      }),
    );
  });

  it('refuses when AniList turns the token down', async () => {
    const { host } = aHost({ answers: () => ({ status: 401, text: '' }) });

    await expect(readAniListEntries(host, 'token')).rejects.toThrow('AniList answered 401');
  });
});
