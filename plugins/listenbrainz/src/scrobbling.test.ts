import { aHost } from '@Shared/testing/aHost';
import { actOnListening } from './actOnListening';
import { scrobble } from './scrobble';
import { contextFor } from './testing/contextFor';
import { updateEveryone } from './updateEveryone';
import { bothServices } from './testing/bothServices';
import { LASTFM_KEYS } from './testing/LASTFM_KEYS';
import { lastfmAnswers } from './testing/lastfmAnswers';
import { listenBrainzAnswers, TOKEN } from './testing/listenBrainzAnswers';
import { musicLibrary } from './testing/musicLibrary';

const finished = {
  topic: 'playback.stopped',
  occurredAt: '2026-10-05T12:03:35.000Z',
  profileId: 'p1',
  mediaId: 's1',
  positionSeconds: 215,
  durationSeconds: 215,
};

const STARTED_AT = Date.parse('2026-10-05T12:00:00.000Z') / 1000;

const connectedHost = (answers = bothServices()) => {
  const made = aHost({ settings: LASTFM_KEYS, answers, library: musicLibrary() });

  made.stored.set('listenbrainz:p1', { user: 'marques' });
  made.stored.set('lastfm:p1', { user: 'marques' });
  made.secrets.set(
    'p1',
    new Map([
      ['listenbrainz-token', TOKEN],
      ['lastfm-session', 'session-key'],
    ]),
  );

  return made;
};

const waiting = (stored: Map<string, unknown>) =>
  [...stored.keys()].filter((key) => key.startsWith('pending:')).sort();

const sent = (host: ReturnType<typeof aHost>['host']) =>
  host.http.fetch.mock.calls.map(([url, init]) =>
    url.startsWith('https://api.listenbrainz.org')
      ? { to: 'listenbrainz', body: JSON.parse(init?.body ?? 'null') as unknown }
      : { to: 'lastfm', body: Object.fromEntries(new URLSearchParams(init?.body ?? '')) },
  );

describe('scrobbling', () => {
  it('scrobbles a song played far enough to both services, from when it started', async () => {
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
          'artist[0]': 'The Signal Box',
          'track[0]': 'Northern Line',
          'album[0]': 'Platforms',
          'duration[0]': '215',
          'timestamp[0]': STARTED_AT.toString(),
          sk: 'session-key',
          api_key: 'api-key',
          format: 'json',
        }),
      },
    ]);
    expect(waiting(stored)).toEqual([]);
  });

  it('scrobbles nothing stopped before half way, and nothing on the finished event', async () => {
    const { host } = connectedHost();

    expect(await scrobble(host, { ...finished, positionSeconds: 100 })).toEqual([]);
    expect(await scrobble(host, { ...finished, topic: 'playback.finished' })).toEqual([]);
    expect(host.http.fetch).not.toHaveBeenCalled();
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
    expect(waiting(stored)).toEqual([]);
  });

  it('ignores films, unknown songs, other events, and people who turned it off', async () => {
    const { host, stored } = connectedHost();

    expect(await scrobble(host, { ...finished, mediaId: 'film' })).toEqual([]);
    expect(await scrobble(host, { ...finished, mediaId: 'gone' })).toEqual([]);
    expect(await scrobble(host, { ...finished, topic: 'playback.paused' })).toEqual([]);
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
    await scrobble(host, { ...finished, mediaId: 's2', occurredAt: '2026-10-05T12:09:00.000Z' });

    expect(waiting(stored)).toHaveLength(2);

    isDown = false;
    host.http.fetch.mockClear();
    await updateEveryone(host, new Date(finished.occurredAt));

    const resent = sent(host).filter((each) => each.to === 'listenbrainz');

    expect(resent).toHaveLength(1);
    expect(resent[0]?.body).toMatchObject({
      listen_type: 'import',
      payload: [
        { track_metadata: expect.objectContaining({ track_name: 'Northern Line' }) },
        { track_metadata: expect.objectContaining({ track_name: 'Low Tide' }) },
      ],
    });
    expect(waiting(stored)).toEqual([]);
  });

  it('disconnects a service that refuses the sign-in, and says so', async () => {
    const { host, stored, secrets } = connectedHost(
      bothServices(
        listenBrainzAnswers([], 401, { isTokenValid: false }),
        lastfmAnswers({ scrobbleError: 9 }),
      ),
    );

    await scrobble(host, finished);

    expect(stored.has('listenbrainz:p1')).toBe(false);
    expect(stored.has('lastfm:p1')).toBe(false);
    expect([...(secrets.get('p1')?.keys() ?? [])]).toEqual([]);
    expect(waiting(stored)).toEqual([]);
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

    expect(stored.get('listenbrainz:p1')).toEqual({ user: 'marques' });
    expect(waiting(stored)).toEqual([]);
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

  it('keeps a scrobble Last.fm held back for its daily limit, and lets go of one it ignored for good', async () => {
    const { host, stored } = connectedHost(
      bothServices(listenBrainzAnswers(), lastfmAnswers({ ignored: { 0: 5, 1: 3 } })),
    );

    stored.set('preferences:p1', { scrobble: true, keep: [] });
    await scrobble(host, finished);
    await scrobble(host, { ...finished, mediaId: 's2', occurredAt: '2026-10-05T12:09:00.000Z' });

    expect(waiting(stored).filter((key) => key.includes(':lastfm:'))).toHaveLength(1);
  });

  it('holds scrobbles while the server’s Last.fm key is refused, without disconnecting anyone', async () => {
    const { host, stored } = connectedHost(
      bothServices(listenBrainzAnswers(), lastfmAnswers({ scrobbleError: 26 })),
    );

    await scrobble(host, finished);

    expect(stored.get('lastfm:p1')).toEqual({ user: 'marques' });
    expect(waiting(stored).filter((key) => key.includes(':lastfm:'))).toHaveLength(1);
    expect(host.notifications.send).not.toHaveBeenCalled();
    expect(host.log.error).toHaveBeenCalledWith(
      'Scrobbles are waiting because the server is not set up for them',
      expect.objectContaining({ service: 'lastfm' }),
    );
  });

  it('moves what an earlier version kept: tokens into sealed secrets, and waiting scrobbles one to a key', async () => {
    const { host, stored, secrets } = connectedHost(
      bothServices(listenBrainzAnswers([], 503), lastfmAnswers({ scrobbleError: 11 })),
    );

    secrets.clear();
    stored.set('listenbrainz:p1', { token: TOKEN, user: 'marques' });
    stored.set('pending:p1', [
      {
        service: 'listenbrainz',
        listen: { title: 'Old', artist: 'A', album: null, durationSeconds: 200, startedAt: 100 },
      },
    ]);

    await updateEveryone(host, new Date(finished.occurredAt));

    expect(stored.get('listenbrainz:p1')).toEqual({ user: 'marques' });
    expect(secrets.get('p1')?.get('listenbrainz-token')).toBe(TOKEN);
    expect(stored.has('pending:p1')).toBe(false);
    expect(waiting(stored)).toEqual([
      expect.stringMatching(/^pending:p1:listenbrainz:000000000100:[0-9a-f]{8}$/u),
    ]);
  });

  it('sends one at a time, in turn, when ListenBrainz refuses a batch', async () => {
    let isBatchRefused = true;
    const { host, stored } = connectedHost(
      bothServices(
        (url, init) =>
          isBatchRefused && (init.body ?? '').includes('"import"')
            ? { status: 400, text: JSON.stringify({ error: 'Bad listen' }) }
            : listenBrainzAnswers([], isBatchRefused ? 503 : 200)(url, init),
        lastfmAnswers(),
      ),
    );

    await scrobble(host, finished);
    await scrobble(host, { ...finished, mediaId: 's2', occurredAt: '2026-10-05T12:09:00.000Z' });
    isBatchRefused = true;
    host.http.fetch.mockClear();
    await updateEveryone(host, new Date(finished.occurredAt));

    const listenTypes = sent(host)
      .filter((each) => each.to === 'listenbrainz')
      .map((each) => JSON.stringify(each.body).match(/"listen_type":"(\w+)"/u)?.[1]);

    expect(listenTypes).toEqual(['import', 'single', 'single']);
    expect(waiting(stored).filter((key) => key.includes(':listenbrainz:'))).toHaveLength(2);
  });

  it('keeps two songs started in the same second apart', async () => {
    const { host, stored } = connectedHost(
      bothServices(listenBrainzAnswers([], 503), lastfmAnswers({ scrobbleError: 11 })),
    );

    await scrobble(host, finished);
    await scrobble(host, { ...finished, mediaId: 's2', positionSeconds: 215 - 26 + 26 });

    expect(waiting(stored).filter((key) => key.includes(':listenbrainz:'))).toHaveLength(2);
  });

  it('takes a length of zero from the player as unknown, rather than scrobbling at once', async () => {
    const { host } = connectedHost();

    expect(await scrobble(host, { ...finished, positionSeconds: 3, durationSeconds: 0 })).toEqual(
      [],
    );
  });

  it('drops a service’s waiting scrobbles when it is disconnected, so they never reach another account', async () => {
    const { host, stored } = connectedHost(
      bothServices(listenBrainzAnswers([], 503), lastfmAnswers()),
    );

    await scrobble(host, finished);
    await actOnListening(contextFor(host), {
      action: { id: 'disconnect-listenbrainz' },
      fields: {},
    });

    expect(waiting(stored)).toEqual([]);
  });

  it('reads Last.fm’s answer for a single scrobble, which comes as one object', async () => {
    const { host, stored } = connectedHost(
      bothServices(listenBrainzAnswers(), (url, init) => {
        const params = new URLSearchParams(init.body ?? '');

        return params.get('method') === 'track.scrobble'
          ? {
              status: 200,
              text: JSON.stringify({
                scrobbles: {
                  scrobble: { ignoredMessage: { code: '5', '#text': 'Daily limit' } },
                  '@attr': { accepted: 0, ignored: 1 },
                },
              }),
            }
          : lastfmAnswers()(url, init);
      }),
    );

    await scrobble(host, finished);

    expect(waiting(stored).filter((key) => key.includes(':lastfm:'))).toHaveLength(1);
  });
});
