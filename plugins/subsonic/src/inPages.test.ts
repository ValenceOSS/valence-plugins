import { inPages } from './inPages';

const LIBRARY = Array.from({ length: 450 }, (_, at) => at);

describe('inPages', () => {
  it('reads past the host’s page of 200 in turn, from where the app asked to start', async () => {
    const asked: [number, number][] = [];
    const read = (offset: number, limit: number) => {
      asked.push([offset, limit]);

      return Promise.resolve(LIBRARY.slice(offset, offset + limit));
    };

    const found = await inPages(10, 500, read);

    expect(found).toEqual(LIBRARY.slice(10, 450));
    expect(asked).toEqual([
      [10, 200],
      [210, 200],
      [410, 100],
    ]);
  });

  it('asks once for a page that fits, and nothing for nothing', async () => {
    const read = vi.fn((offset: number, limit: number) =>
      Promise.resolve(LIBRARY.slice(offset, offset + limit)),
    );

    expect(await inPages(0, 20, read)).toHaveLength(20);
    expect(await inPages(0, 0, read)).toEqual([]);
    expect(read).toHaveBeenCalledTimes(1);
  });
});
