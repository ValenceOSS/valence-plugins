import { aHost } from '@Shared/testing/aHost';
import { scrobble } from './scrobble';
import { updateEveryone } from './updateEveryone';
import { bothServices } from './testing/bothServices';
import { LASTFM_KEYS } from './testing/LASTFM_KEYS';
import { lastfmAnswers } from './testing/lastfmAnswers';
import { listenBrainzAnswers, TOKEN } from './testing/listenBrainzAnswers';
import { musicLibrary } from './testing/musicLibrary';

const finished = {
  topic: 'playback.finished',
  occurredAt: '2026-10-05T12:03:35.000Z',
  profileId: 'p1',
  mediaId: 's1',
  positionSeconds: 215,
  durationSeconds: 215,
};

const STARTED_AT = Date.parse('2026-10-05T12:00:00.000Z') / 1000;

const connectedHost = (answers = bothServices()) => {
  const made = aHost({ settings: LASTFM_KEYS, answers, library: musicLibrary() });

  made.stored.set('listenbrainz:p1', { token: TOKEN, user: 'marques' });
  made.stored.set('lastfm:p1', { sessionKey: 'session-key', user: 'marques' });

  return made;
};

const sent = (host: ReturnType<typeof aHost>['host']) =>
  host.http.fetch.mock.calls.map(([url, init]) =>
    url.startsWith('https://api.listenbrainz.org')
      ? { to: 'listenbrainz', body: JSON.parse(init?.body ?? 'null') as unknown }
      : { to: 'lastfm', body: Object.fromEntries(new URLSearchParams(init?.body ?? '')) },
  );

describe('scrobbling', () => {
  it('scrobbles a finished song to both services, from when it started', async () => {
    const { host, stored } = connectedHost();

    expect(await scrobble(host, finished)).toEqual(['listenbrainz', 'lastfm']);
    expect(sent(host)).toEqual([
      {
        to: 'listenbrainz',
        body: {
          listen_type: 'single',
          payload: [
            {
              listened_at: STARTED_AT,
              track_metadata: {
                artist_name: 'The Signal Box',
                track_name: 'Northern Line',
                release_name: 'Platforms',
                additional_info: {
                  media_player: 'Valence',
                  submission_client: 'Valence',
                  submission_client_version: '1.0.0',
                  duration_ms: 215_000,
                },
              },
            },
          ],
        },
      },
      {
        to: 'lastfm',
        body: expect.objectContaining({
          method: 'track.scrobble',
          artist: 'The Signal Box',
          track: 'Northern Line',
          album: 'Platforms',
          duration: '215',
          timestamp: STARTED_AT.toString(),
          sk: 'session-key',
          api_key: 'api-key',
          format: 'json',
        }),
      },
    ]);
    expect(stored.get('pending:p1')).toEqual([]);
  });

  it('says what is playing now when a song starts, without keeping it to resend', async () => {
    const { host, stored } = connectedHost(
      bothServices(listenBrainzAnswers([], 503), lastfmAnswers()),
    );

    await scrobble(host, { ...finished, topic: 'playback.started', positionSeconds: null });

    expect(sent(host)).toEqual([
      expect.objectContaining({
        to: 'listenbrainz',
        body: expect.objectContaining({
          listen_type: 'playing_now',
          payload: [{ track_metadata: expect.objectContaining({ track_name: 'Northern Line' }) }],
        }),
      }),
      expect.objectContaining({
        to: 'lastfm',
        body: expect.objectContaining({ method: 'track.updateNowPlaying' }),
      }),
    ]);
    expect(stored.has('pending:p1')).toBe(false);
  });

  it('ignores films, unknown songs, other events, and people who turned it off', async () => {
    const { host, stored } = connectedHost();

    expect(await scrobble(host, { ...finished, mediaId: 'film' })).toEqual([]);
    expect(await scrobble(host, { ...finished, mediaId: 'gone' })).toEqual([]);
    expect(await scrobble(host, { ...finished, topic: 'playback.stopped' })).toEqual([]);
    expect(await scrobble(host, { ...finished, profileId: 'p2' })).toEqual([]);

    stored.set('preferences:p1', { scrobble: false, keep: [] });

    expect(await scrobble(host, finished)).toEqual([]);
    expect(host.http.fetch).not.toHaveBeenCalled();
  });

  it('does not scrobble a song of 30 seconds or less to Last.fm', async () => {
    const { host } = connectedHost();

    await scrobble(host, {
      ...finished,
      mediaId: 'jingle',
      durationSeconds: 12,
      positionSeconds: 12,
    });

    expect(sent(host).map((each) => each.to)).toEqual(['listenbrainz']);
  });

  it('keeps scrobbles a service did not take, and sends them in order on the next run', async () => {
    let isDown = true;
    const { host, stored } = connectedHost(
      bothServices(
        (url, init) => (isDown ? { status: 503, text: '' } : listenBrainzAnswers()(url, init)),
        lastfmAnswers(),
      ),
    );

    await scrobble(host, finished);
    await scrobble(host, { ...finished, mediaId: 's2' });

    expect(stored.get('pending:p1')).toEqual([
      { service: 'listenbrainz', listen: expect.objectContaining({ title: 'Northern Line' }) },
      { service: 'listenbrainz', listen: expect.objectContaining({ title: 'Low Tide' }) },
    ]);

    isDown = false;
    host.http.fetch.mockClear();
    await updateEveryone(host, new Date(finished.occurredAt));

    expect(
      sent(host).map(
        (each) =>
          (each.body as { payload: { track_metadata: { track_name: string } }[] }).payload[0]
            ?.track_metadata.track_name,
      ),
    ).toEqual(['Northern Line', 'Low Tide']);
    expect(stored.get('pending:p1')).toEqual([]);
  });

  it('disconnects a service that refuses the sign-in, and says so', async () => {
    const { host, stored } = connectedHost(
      bothServices(
        listenBrainzAnswers([], 401, { isTokenValid: false }),
        lastfmAnswers({ scrobbleError: 9 }),
      ),
    );

    await scrobble(host, finished);

    expect(stored.has('listenbrainz:p1')).toBe(false);
    expect(stored.has('lastfm:p1')).toBe(false);
    expect(stored.get('pending:p1')).toEqual([]);
    expect(host.notifications.send).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({ title: 'Last.fm disconnected' }),
    );
  });

  it('keeps a valid token ListenBrainz will not take listens for, and says why once', async () => {
    const email =
      'The listens were rejected because your MetaBrainz account does not have a verified email address.';
    let status = 401;
    const { host, stored } = connectedHost(
      bothServices(
        (url, init) => listenBrainzAnswers([], status, { error: email })(url, init),
        lastfmAnswers(),
      ),
    );

    await scrobble(host, finished);
    await scrobble(host, { ...finished, mediaId: 's2' });

    expect(stored.get('listenbrainz:p1')).toEqual({ token: TOKEN, user: 'marques' });
    expect(stored.get('pending:p1')).toEqual([]);
    expect(host.log.warn).toHaveBeenCalledWith('A scrobble was refused', {
      service: 'listenbrainz',
      reason: email,
    });
    expect(host.notifications.send).toHaveBeenCalledExactlyOnceWith('p1', {
      title: "ListenBrainz isn't taking your scrobbles",
      body: `ListenBrainz said: ${email}`,
    });

    status = 200;
    await scrobble(host, finished);

    expect(stored.has('told:p1:listenbrainz')).toBe(false);
  });
});
