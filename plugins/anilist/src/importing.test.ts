import { aHost } from '@Shared/testing/aHost';
import { aMedia } from '@Shared/testing/aMedia';
import { continueImport } from './continueImport';
import { readImportJob } from './readImportJob';
import { startImport } from './startImport';
import { aniListAnswers } from './testing/aniListAnswers';
import { anAniListEntry } from './testing/anAniListEntry';
import { exampleLibrary } from './testing/exampleLibrary';

const NOW = new Date('2026-09-28T12:00:00.000Z');

const malAnswer = {
  status: 200,
  text: JSON.stringify({
    data: [
      {
        node: { id: 2001, title: 'Rei no Bouken', num_episodes: 12, start_season: { year: 2023 } },
        list_status: { status: 'watching', num_episodes_watched: 4 },
      },
    ],
  }),
};

const connected = { 'p1:anilist': { accessToken: 'a', account: 'marques' } };

describe('importing a list', () => {
  it('folds a show on both lists into one entry with the furthest progress, keeping finished shows and leaving out unstarted ones', async () => {
    const aniList = aniListAnswers([
      anAniListEntry({ progress: 2 }),
      anAniListEntry({ id: 9, progress: 0 }),
      anAniListEntry({ id: 10, status: 'COMPLETED', progress: 0, title: 'Done Show' }),
    ]);
    const { host } = aHost({
      connections: { ...connected, 'p1:mal': { accessToken: 'm', account: null } },
      answers: (url, init) => (url.includes('myanimelist') ? malAnswer : aniList(url, init)),
    });
    const job = await startImport(host, 'p1', NOW);

    expect(job.entries.map((entry) => [entry.anilistId, entry.malId, entry.progress])).toEqual([
      ['1001', '2001', 4],
      ['10', '1010', 0],
    ]);
  });

  it('marks the watched episodes Valence does not know about, keeps the match for the viewer, and finishes', async () => {
    const { host, stored } = aHost({
      connections: connected,
      answers: aniListAnswers([
        anAniListEntry({ progress: 3 }),
        anAniListEntry({ id: 1, title: 'Nowhere', progress: 1 }),
      ]),
      library: exampleLibrary(),
      finished: ['s1e1'],
    });

    await startImport(host, 'p1', NOW);

    const job = await continueImport(host, 'p1', NOW);

    expect(host.viewing.markWatched.mock.calls).toEqual([
      ['p1', 's1e2'],
      ['p1', 's1e3'],
    ]);
    expect(job).toMatchObject({
      matched: 1,
      marked: 2,
      unmatched: ['Nowhere'],
      finishedAt: NOW.toISOString(),
    });
    expect(stored.get('link:p1:example')).toEqual({
      entries: [
        { anilistId: '1001', malId: '2001', title: 'Example Quest', offset: 0, episodes: 12 },
      ],
    });
    expect(host.notifications.send).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({ title: 'Anime list imported' }),
    );
  });

  it('places a later season after the ones before it, on the same programme', async () => {
    const { host, stored } = aHost({
      connections: connected,
      answers: aniListAnswers([
        anAniListEntry({ status: 'COMPLETED', progress: 12 }),
        anAniListEntry({ id: 1002, progress: 2, title: 'Example Quest 2' }),
      ]),
      library: exampleLibrary(),
    });

    await startImport(host, 'p1', NOW);
    await continueImport(host, 'p1', NOW);

    expect(host.viewing.markWatched.mock.calls.map(([, id]) => id)).toEqual([
      ...Array.from({ length: 12 }, (_, at) => `s1e${(at + 1).toString()}`),
      's2e1',
      's2e2',
    ]);
    expect(stored.get('link:p1:example')).toMatchObject({
      entries: [
        { anilistId: '1001', offset: 0 },
        { anilistId: '1002', offset: 12 },
      ],
    });
    expect(stored.get('chain:anilist:1002')).toMatchObject([
      { anilistId: '1002' },
      { anilistId: '1001', episodes: 12 },
    ]);
  });

  it('never marks past an entry’s last episode, and counts a rewatch as having seen it all', async () => {
    const { host } = aHost({
      connections: connected,
      answers: aniListAnswers([anAniListEntry({ status: 'REPEATING', progress: 2, episodes: 12 })]),
      library: exampleLibrary(),
    });

    await startImport(host, 'p1', NOW);
    await continueImport(host, 'p1', NOW);

    expect(host.viewing.markWatched).toHaveBeenCalledTimes(12);
    expect(host.viewing.markWatched).not.toHaveBeenCalledWith('p1', 's2e1');
  });

  it('leaves a later season unmatched when AniList can’t say what comes before it', async () => {
    const { host } = aHost({
      connections: connected,
      answers: aniListAnswers(
        [anAniListEntry({ id: 1002, progress: 2, title: 'Example Quest 2' })],
        {
          seasons: [{ id: 1002, idMal: 2002, episodes: 12, format: 'TV', prequel: 1001 }],
        },
      ),
      library: exampleLibrary(),
    });

    await startImport(host, 'p1', NOW);

    expect((await continueImport(host, 'p1', NOW))?.unmatched).toEqual(['Example Quest 2']);
    expect(host.viewing.markWatched).not.toHaveBeenCalled();
  });

  it('works through a long list a few shows at a time', async () => {
    const entries = Array.from({ length: 10 }, (_, at) =>
      anAniListEntry({ id: at + 1, title: `Show ${at.toString()}` }),
    );
    const { host } = aHost({ connections: connected, answers: aniListAnswers(entries) });

    await startImport(host, 'p1', NOW);

    expect((await continueImport(host, 'p1', NOW))?.next).toBe(8);
    expect((await continueImport(host, 'p1', NOW))?.finishedAt).toBe(NOW.toISOString());
    expect(await continueImport(host, 'p1', NOW)).toMatchObject({ next: 10 });
  });

  it('does nothing when there is no import', async () => {
    const { host } = aHost();

    expect(await continueImport(host, 'p1', NOW)).toBeNull();
    expect(await readImportJob(host, 'p1')).toBeNull();
  });

  it('carries an import on once at a time, however many ask at once', async () => {
    const { host } = aHost({
      connections: connected,
      answers: aniListAnswers([anAniListEntry()]),
      library: exampleLibrary(),
    });

    await startImport(host, 'p1', NOW);
    await Promise.all([continueImport(host, 'p1', NOW), continueImport(host, 'p1', NOW)]);

    expect(host.viewing.markWatched).toHaveBeenCalledTimes(3);
    expect(host.notifications.send).toHaveBeenCalledTimes(1);
  });

  it('matches a later season to a programme of its own where the library keeps it apart', async () => {
    const { host, stored } = aHost({
      connections: connected,
      answers: aniListAnswers([
        anAniListEntry({ id: 1002, progress: 2, title: 'Example Quest 2' }),
      ]),
      library: [
        ...exampleLibrary(),
        aMedia({ id: 'sequel', title: 'Example Quest 2', externalIds: { anilist: '1002' } }),
        aMedia({
          id: 'q1',
          title: 'One',
          kind: 'episode',
          seriesId: 'sequel',
          seasonNumber: 1,
          episodeNumber: 1,
        }),
        aMedia({
          id: 'q2',
          title: 'Two',
          kind: 'episode',
          seriesId: 'sequel',
          seasonNumber: 1,
          episodeNumber: 2,
        }),
      ],
    });

    await startImport(host, 'p1', NOW);
    await continueImport(host, 'p1', NOW);

    expect(host.viewing.markWatched.mock.calls.map(([, id]) => id)).toEqual(['q1', 'q2']);
    expect(stored.get('link:p1:sequel')).toMatchObject({
      entries: [{ anilistId: '1002', offset: 0 }],
    });
  });

  it('marks nothing on a season after one the library doesn’t have', async () => {
    const { host } = aHost({
      connections: connected,
      answers: aniListAnswers([
        anAniListEntry({ id: 1002, progress: 2, title: 'Example Quest 2' }),
      ]),
      library: exampleLibrary().filter((media) => !media.id.startsWith('s1')),
    });

    await startImport(host, 'p1', NOW);

    expect((await continueImport(host, 'p1', NOW))?.matched).toBe(1);
    expect(host.viewing.markWatched).not.toHaveBeenCalled();
  });

  it('carries on past a show AniList doesn’t know', async () => {
    const malOnly = {
      status: 200,
      text: JSON.stringify({
        data: [
          {
            node: { id: 9999, title: 'Unknown Clip', num_episodes: 1 },
            list_status: { status: 'completed', num_episodes_watched: 1 },
          },
          {
            node: {
              id: 2001,
              title: 'Rei no Bouken',
              num_episodes: 12,
              start_season: { year: 2023 },
            },
            list_status: { status: 'watching', num_episodes_watched: 2 },
          },
        ],
      }),
    };
    const aniList = aniListAnswers([]);
    const { host } = aHost({
      connections: { 'p1:mal': { accessToken: 'm', account: null } },
      answers: (url, init) => (url.includes('myanimelist') ? malOnly : aniList(url, init)),
      library: exampleLibrary(),
    });

    await startImport(host, 'p1', NOW);

    expect(await continueImport(host, 'p1', NOW)).toMatchObject({
      matched: 1,
      unmatched: ['Unknown Clip'],
      finishedAt: NOW.toISOString(),
    });
  });

  it('matches by the first season’s title before a later season’s own, which often shares it', async () => {
    const { host, stored } = aHost({
      connections: connected,
      answers: aniListAnswers([anAniListEntry({ id: 1002, progress: 2, title: 'Example Quest' })]),
      library: exampleLibrary().map((media) =>
        media.id === 'example' ? { ...media, externalIds: {} } : media,
      ),
    });

    await startImport(host, 'p1', NOW);
    await continueImport(host, 'p1', NOW);

    expect(host.viewing.markWatched.mock.calls.map(([, id]) => id)).toEqual(['s2e1', 's2e2']);
    expect(stored.get('link:p1:example')).toMatchObject({
      entries: [{ offset: 0 }, { anilistId: '1002', offset: 12 }],
    });
  });

  it('moves a season past a short web episode between seasons onto the season it starts', async () => {
    const { host, stored } = aHost({
      connections: connected,
      answers: aniListAnswers(
        [anAniListEntry({ id: 1002, progress: 1, title: 'Example Quest 2' })],
        {
          seasons: [
            { id: 1001, idMal: 2001, episodes: 12, format: 'TV' },
            { id: 1500, idMal: null, episodes: 1, format: 'ONA', prequel: 1001 },
            { id: 1002, idMal: 2002, episodes: 12, format: 'TV', prequel: 1500 },
          ],
        },
      ),
      library: exampleLibrary(),
    });

    await startImport(host, 'p1', NOW);
    await continueImport(host, 'p1', NOW);

    expect(host.viewing.markWatched.mock.calls.map(([, id]) => id)).toEqual(['s2e1']);
    expect(stored.get('link:p1:example')).toMatchObject({
      entries: [
        { anilistId: '1001', offset: 0 },
        { anilistId: '1002', offset: 12 },
      ],
    });
  });

  it('places a season numbered across the whole show by its numbers', async () => {
    const { host } = aHost({
      connections: connected,
      answers: aniListAnswers([
        anAniListEntry({ id: 1002, progress: 1, title: 'Example Quest 2' }),
      ]),
      library: exampleLibrary().map((media) =>
        media.seasonNumber === 2 && media.episodeNumber !== null
          ? { ...media, episodeNumber: media.episodeNumber + 12 }
          : media,
      ),
    });

    await startImport(host, 'p1', NOW);
    await continueImport(host, 'p1', NOW);

    expect(host.viewing.markWatched.mock.calls.map(([, id]) => id)).toEqual(['s2e1']);
  });
});
