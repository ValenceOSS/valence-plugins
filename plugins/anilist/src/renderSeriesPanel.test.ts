import { SurfaceSchema } from '@ValenceSDK/surface/SurfaceSchema';
import { aHost } from '@Shared/testing/aHost';
import { renderSeriesPanel } from './renderSeriesPanel';

describe('renderSeriesPanel', () => {
  it('says a programme is not matched yet', async () => {
    const { host } = aHost();
    const panel = await renderSeriesPanel({
      valence: host,
      viewer: { profileId: 'p1', isAdmin: false, nodes: [] },
      subject: { kind: 'series', id: 'example' },
    });

    expect(panel.blocks[0]).toMatchObject({ type: 'text' });
  });

  it('links a matched programme to each list', async () => {
    const { host, stored } = aHost();

    stored.set('link:p1:example', {
      entries: [
        { anilistId: '1001', malId: '2001', title: 'Example Quest', offset: 0, episodes: 12 },
        { anilistId: '1002', malId: null, title: 'Example Quest 2', offset: 12, episodes: null },
      ],
    });

    const panel = SurfaceSchema.parse(
      await renderSeriesPanel({
        valence: host,
        viewer: { profileId: 'p1', isAdmin: false, nodes: [] },
        subject: { kind: 'series', id: 'example' },
      }),
    );

    expect(
      panel.blocks
        .filter((block) => block.type === 'link')
        .map((block) => (block.type === 'link' ? block.url : '')),
    ).toEqual([
      'https://anilist.co/anime/1001',
      'https://myanimelist.net/anime/2001',
      'https://anilist.co/anime/1002',
    ]);
    expect(panel.blocks.filter((block) => block.type === 'row')).toMatchObject([
      { label: 'Example Quest', detail: 'Episodes 1 to 12' },
      { label: 'Example Quest 2', detail: 'From episode 13' },
    ]);
  });

  it('shows one person’s matches to nobody else', async () => {
    const { host, stored } = aHost();

    stored.set('link:p1:example', {
      entries: [
        { anilistId: '1001', malId: null, title: 'Example Quest', offset: 0, episodes: 12 },
      ],
    });

    const panel = await renderSeriesPanel({
      valence: host,
      viewer: { profileId: 'p2', isAdmin: false, nodes: [] },
      subject: { kind: 'series', id: 'example' },
    });

    expect(panel.blocks).toEqual([expect.objectContaining({ type: 'text' })]);
  });

  it('says nothing is matched when there is no programme', async () => {
    const { host } = aHost();

    expect(
      (
        await renderSeriesPanel({
          valence: host,
          viewer: { profileId: 'p1', isAdmin: false, nodes: [] },
          subject: null,
        })
      ).blocks[0],
    ).toMatchObject({ type: 'text' });
  });
});
