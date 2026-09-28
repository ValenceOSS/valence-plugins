import { aHost } from '@Shared/testing/aHost';
import { continueImport } from './continueImport';
import { readImportJob } from './readImportJob';
import { startImport } from './startImport';
import { aniListAnswers } from './testing/aniListAnswers';
import { anAniListEntry } from './testing/anAniListEntry';
import { frierenLibrary } from './testing/frierenLibrary';

const NOW = new Date('2026-09-28T12:00:00.000Z');

const malAnswer = {
  status: 200,
  text: JSON.stringify({
    data: [
      {
        node: {
          id: 52_991,
          title: 'Sousou no Frieren',
          num_episodes: 28,
          start_season: { year: 2023 },
        },
        list_status: { status: 'watching', num_episodes_watched: 4 },
      },
    ],
  }),
};

describe('importing a list', () => {
  it('folds a show on both lists into one entry with the furthest progress, leaving out unstarted shows', async () => {
    const aniList = aniListAnswers([
      anAniListEntry({ progress: 2 }),
      anAniListEntry({ id: 9, progress: 0 }),
    ]);
    const { host } = aHost({
      connections: {
        'p1:anilist': { accessToken: 'a', account: 'marques' },
        'p1:mal': { accessToken: 'm', account: null },
      },
      answers: (url, init) => (url.includes('myanimelist') ? malAnswer : aniList(url, init)),
    });
    const job = await startImport(host, 'p1', NOW);

    expect(job.entries).toHaveLength(1);
    expect(job.entries[0]).toMatchObject({ anilistId: '154587', malId: '52991', progress: 4 });
  });

  it('marks the watched episodes Valence does not know about, remembers every episode, and finishes', async () => {
    const { host, stored } = aHost({
      connections: { 'p1:anilist': { accessToken: 'a', account: 'marques' } },
      answers: aniListAnswers([
        anAniListEntry({ progress: 3 }),
        anAniListEntry({ id: 1, title: 'Nowhere', progress: 1 }),
      ]),
      library: frierenLibrary(),
      finished: ['e1'],
    });

    await startImport(host, 'p1', NOW);

    const job = await continueImport(host, 'p1', NOW);

    expect(host.viewing.markWatched.mock.calls).toEqual([
      ['p1', 'e2'],
      ['p1', 'e3'],
    ]);
    expect(job).toMatchObject({
      matched: 1,
      marked: 2,
      unmatched: ['Nowhere'],
      finishedAt: NOW.toISOString(),
    });
    expect(stored.get('episode:p1:e4')).toEqual({
      anilistId: '154587',
      malId: '52991',
      number: 4,
      episodes: 28,
    });
    expect(stored.get('series:frieren')).toMatchObject({ anilistId: '154587' });
    expect(host.notifications.send).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({ title: 'Anime list imported' }),
    );
  });

  it('works through a long list a few shows at a time', async () => {
    const entries = Array.from({ length: 10 }, (_, at) =>
      anAniListEntry({ id: at + 1, title: `Show ${at.toString()}` }),
    );
    const { host } = aHost({
      connections: { 'p1:anilist': { accessToken: 'a', account: null } },
      answers: aniListAnswers(entries),
    });

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
});
