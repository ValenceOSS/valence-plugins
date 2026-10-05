import type { SurfaceBlock } from '@ValenceSDK/surface/SurfaceBlockSchema';
import { SurfaceSchema } from '@ValenceSDK/surface/SurfaceSchema';
import { aHost } from '@Shared/testing/aHost';
import { actOnListening } from './actOnListening';
import { renderListening } from './renderListening';
import { bothServices } from './testing/bothServices';
import { contextFor } from './testing/contextFor';
import { LASTFM_KEYS } from './testing/LASTFM_KEYS';
import { lastfmAnswers } from './testing/lastfmAnswers';
import { listenBrainzAnswers, TOKEN } from './testing/listenBrainzAnswers';

const NOW = new Date('2026-10-05T12:00:00.000Z');

const flatten = (blocks: readonly SurfaceBlock[]): SurfaceBlock[] =>
  blocks.flatMap((block) =>
    block.type === 'section' ? [block, ...flatten(block.children)] : [block],
  );

const press = async (
  host: ReturnType<typeof aHost>['host'],
  id: string,
  fields: Record<string, string | boolean> = {},
  now = NOW,
) =>
  flatten(
    SurfaceSchema.parse(await actOnListening(contextFor(host), { action: { id }, fields }, now))
      .blocks,
  );

describe('connecting ListenBrainz', () => {
  it('keeps a token ListenBrainz accepts, as the account it belongs to', async () => {
    const { host, stored } = aHost({ answers: bothServices() });
    const blocks = await press(host, 'connect-listenbrainz', { listenbrainzToken: ` ${TOKEN} ` });

    expect(stored.get('listenbrainz:p1')).toEqual({ token: TOKEN, user: 'marques' });
    expect(blocks).toContainEqual(
      expect.objectContaining({ type: 'row', detail: 'Connected as marques' }),
    );
    expect(host.http.fetch).toHaveBeenCalledWith(
      'https://api.listenbrainz.org/1/validate-token',
      expect.objectContaining({
        headers: expect.objectContaining({
          'user-agent': 'Valence/1.0.0 ( https://github.com/ValenceOSS/Valence )',
        }),
      }),
    );
  });

  it('says why a token was not kept', async () => {
    const { host, stored } = aHost({ answers: bothServices() });

    expect((await press(host, 'connect-listenbrainz', { listenbrainzToken: 'hello' }))[0]).toEqual({
      type: 'notice',
      tone: 'danger',
      text: 'That is not a ListenBrainz user token. It is on your ListenBrainz settings page.',
    });
    expect(
      (
        await press(host, 'connect-listenbrainz', {
          listenbrainzToken: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
        })
      )[0],
    ).toMatchObject({ tone: 'danger', text: expect.stringContaining('did not accept') });
    expect(stored.has('listenbrainz:p1')).toBe(false);
  });

  it('disconnects', async () => {
    const { host, stored } = aHost();

    stored.set('listenbrainz:p1', { token: TOKEN, user: 'marques' });
    await press(host, 'disconnect-listenbrainz');

    expect(stored.has('listenbrainz:p1')).toBe(false);
  });
});

describe('connecting Last.fm', () => {
  it('asks an administrator for the API keys first', async () => {
    const { host } = aHost();
    const blocks = flatten((await renderListening(contextFor(host))).blocks);

    expect(blocks).toContainEqual(
      expect.objectContaining({ type: 'notice', text: expect.stringContaining('Last.fm API key') }),
    );
    expect(blocks.some((block) => block.type === 'section' && block.title === 'Scrobbling')).toBe(
      false,
    );
  });

  it('sends the person to Last.fm to allow it, then finishes once they have', async () => {
    let isAllowed = false;
    const { host, stored } = aHost({
      settings: LASTFM_KEYS,
      answers: bothServices(listenBrainzAnswers(), lastfmAnswers({ isAllowed: () => isAllowed })),
    });

    expect(await press(host, 'connect-lastfm')).toContainEqual({
      type: 'link',
      label: 'Allow on Last.fm',
      url: 'https://www.last.fm/api/auth/?api_key=api-key&token=signin-token',
    });

    const early = await press(host, 'finish-lastfm');

    expect(early[0]).toMatchObject({
      tone: 'danger',
      text: expect.stringContaining('not been allowed'),
    });
    expect(early).toContainEqual(expect.objectContaining({ label: 'Finish connecting' }));

    isAllowed = true;

    expect(await press(host, 'finish-lastfm')).toContainEqual(
      expect.objectContaining({ type: 'row', label: 'Last.fm', detail: 'Connected as marques' }),
    );
    expect(stored.get('lastfm:p1')).toEqual({ sessionKey: 'session-key', user: 'marques' });
    expect(stored.has('lastfm-sign-in:p1')).toBe(false);

    const body = new URLSearchParams(host.http.fetch.mock.calls.at(-1)?.[1]?.body ?? '');

    expect(body.get('method')).toBe('auth.getSession');
    expect(body.get('format')).toBe('json');
    expect(body.get('api_sig')).toMatch(/^[0-9a-f]{32}$/u);
  });

  it('starts again when the sign-in has run out', async () => {
    const { host, stored } = aHost({ settings: LASTFM_KEYS, answers: bothServices() });

    await press(host, 'connect-lastfm');

    const later = await press(host, 'finish-lastfm', {}, new Date(NOW.getTime() + 61 * 60_000));

    expect(later[0]).toMatchObject({ text: 'That sign-in ran out. Connect Last.fm again.' });
    expect(later).toContainEqual(expect.objectContaining({ label: 'Connect Last.fm' }));
    expect(stored.has('lastfm:p1')).toBe(false);
  });
});
