import { aMedia } from '@Shared/testing/aMedia';
import { indexOf } from './indexOf';

describe('indexOf', () => {
  it('groups artists by their first letter, past a leading article, and the rest under #', () => {
    const artist = (id: string, title: string) => aMedia({ id, title, kind: 'artist' });

    expect(
      indexOf(
        [
          artist('a1', 'The Band'),
          artist('a2', 'Björk'),
          artist('a3', '2Pac'),
          artist('a4', 'Air'),
        ],
        1000,
      ),
    ).toMatchObject({
      lastModified: 1000,
      ignoredArticles: 'The El La Los Las Le Les',
      index: [
        { name: '#', artist: [{ id: 'a3' }] },
        { name: 'A', artist: [{ id: 'a4' }] },
        { name: 'B', artist: [{ id: 'a1' }, { id: 'a2' }] },
      ],
    });
  });

  it('indexes a large library quickly', () => {
    const artists = Array.from({ length: 50_000 }, (_, at) =>
      aMedia({ id: `a${at.toString()}`, title: `Artist ${at.toString()}`, kind: 'artist' }),
    );
    const started = performance.now();

    indexOf(artists);

    expect(performance.now() - started).toBeLessThan(1000);
  });
});
