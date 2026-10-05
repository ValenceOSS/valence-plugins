import { aHost } from '@Shared/testing/aHost';
import { aMedia } from '@Shared/testing/aMedia';
import { pushWatch } from './pushWatch';
import { traktAnswers } from './testing/traktAnswers';
import { traktLibrary } from './testing/traktLibrary';

const finished = {
  topic: 'playback.finished',
  occurredAt: '2026-10-05T21:30:00.000Z',
  profileId: 'p1',
  mediaId: 'e2',
  positionSeconds: 2700,
  durationSeconds: 2800,
};

const connected = {
  settings: { traktClientId: 'client' },
  connections: { 'p1:trakt': { accessToken: 't', account: null } },
  answers: traktAnswers([]),
};

const posted = (host: ReturnType<typeof aHost>['host']): unknown =>
  JSON.parse(host.http.fetch.mock.calls[0]?.[1]?.body ?? 'null');

describe('pushWatch', () => {
  it('adds a finished episode to Trakt by its show’s TMDB id and its numbers', async () => {
    const { host } = aHost({ ...connected, library: traktLibrary() });

    expect(await pushWatch(host, finished)).toBe(true);
    expect(host.http.fetch.mock.calls[0]?.[0]).toBe('https://api.trakt.tv/sync/history');
    expect(host.log.info).toHaveBeenCalledWith('Added a finished watch to Trakt', {
      profile: 'p1',
      media: 'e2',
      kind: 'episode',
      answer: expect.stringContaining('added'),
    });
    expect(posted(host)).toEqual({
      shows: [
        {
          ids: { tmdb: 4242, imdb: 'tt2000002' },
          seasons: [{ number: 1, episodes: [{ number: 2, watched_at: finished.occurredAt }] }],
        },
      ],
    });
  });

  it('falls back on the IMDb id an episode carries, then on the title', async () => {
    const { host } = aHost({
      ...connected,
      library: [
        aMedia({ id: 'show', title: 'Harbour Lights', year: 2024 }),
        aMedia({
          id: 'e1',
          kind: 'episode',
          title: 'Pilot',
          seriesId: 'show',
          seasonNumber: 1,
          episodeNumber: 1,
          externalIds: { imdb: 'tt2000002' },
        }),
        aMedia({ id: 'f', kind: 'film', title: 'Quiet Fields', year: 2019 }),
      ],
    });

    await pushWatch(host, { ...finished, mediaId: 'e1' });
    await pushWatch(host, { ...finished, mediaId: 'f' });

    expect(posted(host)).toMatchObject({ shows: [{ ids: { imdb: 'tt2000002' } }] });
    expect(JSON.parse(host.http.fetch.mock.calls[1]?.[1]?.body ?? 'null')).toEqual({
      movies: [{ title: 'Quiet Fields', year: 2019, watched_at: finished.occurredAt }],
    });
  });

  it('adds a finished film by its ids', async () => {
    const { host } = aHost({ ...connected, library: traktLibrary() });

    await pushWatch(host, { ...finished, mediaId: 'film' });

    expect(posted(host)).toEqual({
      movies: [{ ids: { tmdb: 9001, imdb: 'tt1000001' }, watched_at: finished.occurredAt }],
    });
  });

  it('tells Trakt nothing about songs, other events, or when it is off or not connected', async () => {
    const { host, stored } = aHost({
      ...connected,
      library: [...traktLibrary(), aMedia({ id: 'song', kind: 'track', title: 'A Song' })],
    });

    expect(await pushWatch(host, { ...finished, mediaId: 'song' })).toBe(false);
    expect(await pushWatch(host, { ...finished, topic: 'playback.started' })).toBe(false);
    expect(await pushWatch(host, { ...finished, profileId: null })).toBe(false);
    expect(await pushWatch(host, { ...finished, profileId: 'p2' })).toBe(false);

    stored.set('preferences:p1', { twoWay: false });

    expect(await pushWatch(host, finished)).toBe(false);
    expect(host.http.fetch).not.toHaveBeenCalled();
    expect(host.log.info.mock.calls.map(([message]) => message)).toEqual([
      'Did not send a finish to Trakt: sending is turned off',
    ]);
  });

  it('fails loudly when Trakt refuses', async () => {
    const { host } = aHost({
      ...connected,
      library: traktLibrary(),
      answers: () => ({ status: 503, text: '' }),
    });

    await expect(pushWatch(host, finished)).rejects.toThrow('Trakt answered 503');
  });
});
