import type { SurfaceBlock } from '@ValenceSDK/surface/SurfaceBlockSchema';
import { SurfaceSchema } from '@ValenceSDK/surface/SurfaceSchema';
import { aHost } from '@Shared/testing/aHost';
import { actOnImport } from './actOnImport';
import { renderImport } from './renderImport';
import { spotifyAnswers } from './testing/spotifyAnswers';

const NOW = new Date('2026-09-28T12:00:00.000Z');

const flatten = (blocks: readonly SurfaceBlock[]): SurfaceBlock[] =>
  blocks.flatMap((block) =>
    block.type === 'section' ? [block, ...flatten(block.children)] : [block],
  );

const contextFor = (host: ReturnType<typeof aHost>['host']) => ({
  valence: host,
  viewer: { profileId: 'p1', isAdmin: false, nodes: [] },
  subject: null,
});

describe('the import page', () => {
  it('offers a link box, and a Spotify connection once an administrator has set Spotify up', async () => {
    const plain = flatten(SurfaceSchema.parse(await renderImport(contextFor(aHost().host))).blocks);
    const ready = flatten(
      (await renderImport(contextFor(aHost({ settings: { spotifyClientId: 'id' } }).host))).blocks,
    );

    expect(plain).toContainEqual(expect.objectContaining({ type: 'textField', field: 'link' }));
    expect(plain).toContainEqual(expect.objectContaining({ type: 'text', tone: 'muted' }));
    expect(ready).toContainEqual(
      expect.objectContaining({
        type: 'button',
        action: { id: 'valence.accounts.connect', payload: { provider: 'spotify' } },
      }),
    );
  });

  it('lists the playlists of a connected Spotify account to import', async () => {
    const { host } = aHost({
      connections: { 'p1:spotify': { accessToken: 'mine', account: 'marques' } },
      answers: spotifyAnswers,
    });
    const blocks = flatten(SurfaceSchema.parse(await renderImport(contextFor(host))).blocks);

    expect(blocks).toContainEqual(
      expect.objectContaining({ type: 'row', label: 'Spotify', detail: 'Connected as marques' }),
    );
    expect(blocks).toContainEqual(
      expect.objectContaining({
        type: 'list',
        rows: expect.arrayContaining([
          expect.objectContaining({ label: 'Running', detail: '12 songs' }),
        ]),
      }),
    );
  });

  it('imports a playlist from a connected account and shows how it went', async () => {
    const { host } = aHost({
      connections: { 'p1:spotify': { accessToken: 'mine', account: null } },
      answers: spotifyAnswers,
    });
    const page = await actOnImport(
      contextFor(host),
      {
        action: { id: 'import-spotify', payload: { playlist: 'mix1' } },
        fields: { shouldRequest: false },
      },
      NOW,
    );
    const blocks = flatten(SurfaceSchema.parse(page).blocks);

    expect(blocks).toContainEqual(
      expect.objectContaining({ type: 'notice', tone: 'success', title: 'Running imported' }),
    );
    expect(blocks).toContainEqual(
      expect.objectContaining({ type: 'list', title: 'Not in your library' }),
    );
  });

  it('shows an import part way, with a way to carry on', async () => {
    const { host, stored } = aHost();

    stored.set('import:p1', {
      source: 'spotify',
      name: 'Long',
      tracks: Array.from({ length: 40 }, () => ({
        title: 't',
        artist: 'a',
        album: null,
        isrc: null,
      })),
      next: 0,
      playlistId: 'playlist-1',
      found: 0,
      missing: [],
      requested: [],
      shouldRequest: false,
      startedAt: NOW.toISOString(),
      finishedAt: null,
    });

    const blocks = flatten(
      (await actOnImport(contextFor(host), { action: { id: 'continue' }, fields: {} }, NOW)).blocks,
    );

    expect(blocks).toContainEqual(expect.objectContaining({ type: 'progress', value: 25 / 40 }));
    expect(blocks.some((block) => block.type === 'textField')).toBe(false);
  });

  it('says why a link could not be imported', async () => {
    const say = async (
      fields: Record<string, string | boolean>,
      settings: Record<string, string> = {},
    ) => {
      const { host } = aHost({ settings, answers: () => ({ status: 500, text: '' }) });
      const blocks = (
        await actOnImport(contextFor(host), { action: { id: 'import-link' }, fields }, NOW)
      ).blocks;

      return blocks[0]?.type === 'notice' ? blocks[0].text : null;
    };

    expect(await say({ link: 'nonsense' })).toBe(
      'That is not a Spotify or Apple Music playlist link.',
    );
    expect(await say({})).toBe('That is not a Spotify or Apple Music playlist link.');
    expect(await say({ link: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M' })).toBe(
      'Connect Spotify first, or ask an administrator to add Spotify’s client id and secret.',
    );
    expect(await say({ link: 'https://music.apple.com/gb/playlist/x/pl.abcdefgh1' })).toBe(
      'An administrator needs to add an Apple Music developer token in this plugin’s settings.',
    );
    expect(
      await say(
        { link: 'https://music.apple.com/gb/playlist/x/pl.abcdefgh1' },
        { appleMusicToken: 'dev' },
      ),
    ).toBe('The playlist could not be read. It may be private, or the service may be busy.');
  });

  it('ignores an action it does not know', async () => {
    const { host } = aHost();

    expect(
      (await actOnImport(contextFor(host), { action: { id: 'unknown' }, fields: {} }, NOW))
        .blocks[0]?.type,
    ).not.toBe('notice');
  });
});
