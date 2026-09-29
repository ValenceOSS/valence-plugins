import { SurfaceSchema } from '@ValenceSDK/surface/SurfaceSchema';
import { aHost } from '@Shared/testing/aHost';
import { renderSeriesPanel } from './renderSeriesPanel';

describe('renderSeriesPanel', () => {
  it('says a programme is not matched yet', async () => {
    const { host } = aHost();
    const panel = await renderSeriesPanel({
      valence: host,
      viewer: { profileId: 'p1', isAdmin: false, nodes: [] },
      subject: { kind: 'series', id: 'frieren' },
    });

    expect(panel.blocks[0]).toMatchObject({ type: 'text' });
  });

  it('links a matched programme to each list', async () => {
    const { host, stored } = aHost();

    stored.set('series:frieren', { anilistId: '154587', malId: '52991', title: 'Frieren' });

    const panel = SurfaceSchema.parse(
      await renderSeriesPanel({
        valence: host,
        viewer: { profileId: 'p1', isAdmin: false, nodes: [] },
        subject: { kind: 'series', id: 'frieren' },
      }),
    );

    expect(
      panel.blocks
        .filter((block) => block.type === 'link')
        .map((block) => (block.type === 'link' ? block.url : '')),
    ).toEqual(['https://anilist.co/anime/154587', 'https://myanimelist.net/anime/52991']);
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
