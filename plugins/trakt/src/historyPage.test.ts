import type { SurfaceBlock } from '@ValenceSDK/surface/SurfaceBlockSchema';
import { SurfaceSchema } from '@ValenceSDK/surface/SurfaceSchema';
import { aHost } from '@Shared/testing/aHost';
import { actOnHistory } from './actOnHistory';
import { renderHistory } from './renderHistory';
import { aFilmPlay } from './testing/aTraktPlay';
import { traktAnswers } from './testing/traktAnswers';
import { traktLibrary } from './testing/traktLibrary';

const NOW = new Date('2026-10-05T12:00:00.000Z');

const flatten = (blocks: readonly SurfaceBlock[]): SurfaceBlock[] =>
  blocks.flatMap((block) =>
    block.type === 'section' ? [block, ...flatten(block.children)] : [block],
  );

const contextFor = (host: ReturnType<typeof aHost>['host']) => ({
  valence: host,
  viewer: { profileId: 'p1', isAdmin: false, nodes: [] },
  subject: null,
});

const blocksOf = async (host: ReturnType<typeof aHost>['host']) =>
  flatten(SurfaceSchema.parse(await renderHistory(contextFor(host))).blocks);

describe('the Trakt page', () => {
  it('asks an administrator for a client id before Trakt can be connected', async () => {
    const { host } = aHost();
    const blocks = await blocksOf(host);

    expect(blocks).toContainEqual(expect.objectContaining({ type: 'notice', title: 'Trakt' }));
    expect(blocks.some((block) => block.type === 'button' && block.label === 'Connect Trakt')).toBe(
      false,
    );
  });

  it('offers to connect once set up, and once connected shows who as and offers an import', async () => {
    const { host, stored } = aHost({ settings: { traktClientId: 'client' } });

    expect(await blocksOf(host)).toContainEqual({
      type: 'button',
      label: 'Connect Trakt',
      action: { id: 'valence.accounts.connect', payload: { provider: 'trakt' } },
      icon: 'link',
    });

    const connected = aHost({
      settings: { traktClientId: 'client' },
      connections: { 'p1:trakt': { accessToken: 't', account: null } },
      answers: traktAnswers([]),
    });
    const blocks = await blocksOf(connected.host);

    expect(blocks).toContainEqual(
      expect.objectContaining({
        type: 'row',
        detail: 'Connected as marques',
        action: expect.objectContaining({ id: 'valence.accounts.disconnect' }),
      }),
    );
    expect(blocks).toContainEqual(
      expect.objectContaining({ type: 'button', label: 'Import my history' }),
    );
    expect(connected.stored.get('account:p1')).toBe('marques');
    expect(stored.has('account:p1')).toBe(false);
  });

  it('imports, then shows how it went and what the library does not have', async () => {
    const { host } = aHost({
      settings: { traktClientId: 'client' },
      connections: { 'p1:trakt': { accessToken: 't', account: null } },
      answers: traktAnswers([
        aFilmPlay(),
        aFilmPlay({ trakt: 2, title: 'Nowhere', tmdb: 1, imdb: null }),
      ]),
      library: traktLibrary(),
    });
    const blocks = flatten(
      SurfaceSchema.parse(
        await actOnHistory(contextFor(host), { action: { id: 'import' }, fields: {} }, NOW),
      ).blocks,
    );

    expect(blocks).toContainEqual(
      expect.objectContaining({
        type: 'notice',
        tone: 'success',
        text: 'Found 1 of 2 plays in your library and marked 1 watched.',
      }),
    );
    expect(blocks).toContainEqual({
      type: 'list',
      title: 'Not in your library',
      rows: [{ type: 'row', label: 'Nowhere (2021)' }],
    });
    expect(blocks).toContainEqual(
      expect.objectContaining({ type: 'button', label: 'Import again' }),
    );
  });

  it('says so when Trakt cannot be reached, keeping the import to carry on later', async () => {
    const { host, stored } = aHost({
      settings: { traktClientId: 'client' },
      connections: { 'p1:trakt': { accessToken: 't', account: null } },
      answers: () => ({ status: 502, text: '' }),
    });
    stored.set('account:p1', 'marques');

    const blocks = flatten(
      (await actOnHistory(contextFor(host), { action: { id: 'import' }, fields: {} }, NOW)).blocks,
    );

    expect(blocks[0]).toMatchObject({ type: 'notice', tone: 'danger' });
    expect(blocks).toContainEqual(
      expect.objectContaining({ type: 'progress', label: 'Importing' }),
    );
    expect(stored.get('import:p1')).toMatchObject({ finishedAt: null });
  });

  it('saves the choice to send what is finished', async () => {
    const { host, stored } = aHost();

    await actOnHistory(contextFor(host), { action: { id: 'save' }, fields: { twoWay: false } });

    expect(stored.get('preferences:p1')).toEqual({ twoWay: false });
  });
});
