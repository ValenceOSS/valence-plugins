import { aMedia } from '@Shared/testing/aMedia';
import { orderedEpisodes } from './orderedEpisodes';

describe('orderedEpisodes', () => {
  it('orders by season then episode and leaves out specials and unnumbered episodes', () => {
    const episode = (id: string, seasonNumber: number | null, episodeNumber: number | null) =>
      aMedia({ id, title: id, kind: 'episode', seasonNumber, episodeNumber });

    expect(
      orderedEpisodes([
        episode('s2e1', 2, 1),
        episode('special', 0, 1),
        episode('s1e2', 1, 2),
        episode('loose', 1, null),
        episode('s1e1', null, 1),
      ]).map((each) => each.id),
    ).toEqual(['s1e1', 's1e2', 's2e1']);
  });
});
