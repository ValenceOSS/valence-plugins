import type { SurfaceBlock } from '@ValenceSDK/surface/SurfaceBlockSchema';
import { SurfaceSchema } from '@ValenceSDK/surface/SurfaceSchema';
import { aHost } from '@Shared/testing/aHost';
import { actOnTracking } from './actOnTracking';
import { renderTracking } from './renderTracking';
import { aniListAnswers } from './testing/aniListAnswers';
import { anAniListEntry } from './testing/anAniListEntry';
import { frierenLibrary } from './testing/frierenLibrary';

const NOW = new Date('2026-09-28T12:00:00.000Z');

const flatten = (blocks: readonly SurfaceBlock[]): SurfaceBlock[] =>
  blocks.flatMap((block) =>
    block.type === 'section' ? [block, ...flatten(block.children)] : [block],
  );

const contextFor = (host: ReturnType<typeof aHost>['host']) => ({
  valence: host,
  viewer: { profileId: 'p1', isAdmin: false },
  subject: null,
});

describe('the tracking page', () => {
  it('asks an administrator for client ids before anything can be connected', async () => {
    const { host } = aHost();
    const page = SurfaceSchema.parse(await renderTracking(contextFor(host)));
    const blocks = flatten(page.blocks);

    expect(blocks.filter((block) => block.type === 'notice')).toHaveLength(2);
    expect(blocks.some((block) => block.type === 'button' && block.action.id === 'import')).toBe(
      false,
    );
  });

  it('offers to connect a list once its client id is set, and to import once connected', async () => {
    const { host } = aHost({
      settings: { anilistClientId: 'id', malClientId: 'id' },
      connections: { 'p1:anilist': { accessToken: 'a', account: 'marques' } },
    });
    const blocks = flatten(SurfaceSchema.parse(await renderTracking(contextFor(host))).blocks);

    expect(blocks).toContainEqual({
      type: 'button',
      label: 'Connect MyAnimeList',
      action: { id: 'valence.accounts.connect', payload: { provider: 'mal' } },
      icon: 'link',
    });
    expect(blocks).toContainEqual(
      expect.objectContaining({ type: 'row', label: 'AniList', detail: 'Connected as marques' }),
    );
    expect(blocks).toContainEqual(
      expect.objectContaining({ type: 'button', label: 'Import my lists' }),
    );
  });

  it('imports, then shows how it went and what was not found', async () => {
    const { host } = aHost({
      settings: { anilistClientId: 'id' },
      connections: { 'p1:anilist': { accessToken: 'a', account: null } },
      answers: aniListAnswers([anAniListEntry(), anAniListEntry({ id: 1, title: 'Nowhere' })]),
      library: frierenLibrary(),
    });
    const page = await actOnTracking(
      contextFor(host),
      { action: { id: 'import' }, fields: {} },
      NOW,
    );
    const blocks = flatten(SurfaceSchema.parse(page).blocks);

    expect(blocks).toContainEqual(expect.objectContaining({ type: 'notice', tone: 'success' }));
    expect(blocks).toContainEqual({
      type: 'list',
      title: 'Not found in your library',
      rows: [{ type: 'row', label: 'Nowhere' }],
    });
  });

  it('shows an import part way, with a way to carry on', async () => {
    const { host } = aHost({
      connections: { 'p1:anilist': { accessToken: 'a', account: null } },
      answers: aniListAnswers(
        Array.from({ length: 10 }, (_, at) => anAniListEntry({ id: at + 1 })),
      ),
    });
    const page = await actOnTracking(
      contextFor(host),
      { action: { id: 'import' }, fields: {} },
      NOW,
    );
    const blocks = flatten(page.blocks);

    expect(blocks).toContainEqual(expect.objectContaining({ type: 'progress', value: 0.8 }));

    const carried = flatten(
      (await actOnTracking(contextFor(host), { action: { id: 'continue' }, fields: {} }, NOW))
        .blocks,
    );

    expect(carried).toContainEqual(expect.objectContaining({ type: 'notice', tone: 'success' }));
  });

  it('saves the choice to pass progress back', async () => {
    const { host, stored } = aHost();

    await actOnTracking(contextFor(host), { action: { id: 'save' }, fields: { twoWay: false } });
    await actOnTracking(contextFor(host), { action: { id: 'unknown' }, fields: {} });

    expect(stored.get('preferences:p1')).toEqual({ twoWay: false });
  });

  it('offers to disconnect a connected list through Valence', async () => {
    const { host } = aHost({ connections: { 'p1:mal': { accessToken: 'm', account: null } } });
    const blocks = flatten((await renderTracking(contextFor(host))).blocks);

    expect(blocks).toContainEqual(
      expect.objectContaining({
        type: 'row',
        label: 'MyAnimeList',
        detail: 'Connected',
        action: expect.objectContaining({
          id: 'valence.accounts.disconnect',
          payload: { provider: 'mal' },
        }),
      }),
    );
  });
});
