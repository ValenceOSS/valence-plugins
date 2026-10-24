import { aHost } from '@Shared/testing/aHost';
import { syncEveryone } from './syncEveryone';
import { aniListAnswers } from './testing/aniListAnswers';
import { anAniListEntry } from './testing/anAniListEntry';

const NOW = new Date('2026-09-28T12:00:00.000Z');

const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * 3_600_000).toISOString();

const anEntry = {
  provider: 'anilist',
  id: '1',
  anilistId: '1',
  malId: null,
  titles: ['x'],
  year: null,
  progress: 1,
  episodes: null,
  status: 'watching',
};

const aJob = (finishedAt: string | null, entries: (typeof anEntry)[] = []) => ({
  entries,
  next: 0,
  matched: 0,
  marked: 0,
  unmatched: [],
  startedAt: hoursAgo(48),
  finishedAt,
  isLinked: true,
});

describe('syncEveryone', () => {
  it('reads nobody’s list until they have imported it themselves', async () => {
    const { host, stored } = aHost({
      connections: { 'p1:anilist': { accessToken: 'a', account: null } },
      answers: aniListAnswers([anAniListEntry()]),
    });

    expect(await syncEveryone(host, NOW)).toBe(0);
    expect(stored.has('import:p1')).toBe(false);
    expect(host.http.fetch).not.toHaveBeenCalled();
  });

  it('reads an imported list again once a day, and leaves a recent one alone', async () => {
    const { host, stored } = aHost({
      connections: { 'p1:anilist': { accessToken: 'a', account: null } },
      answers: aniListAnswers([anAniListEntry()]),
    });

    stored.set('import:p1', aJob(hoursAgo(2)));
    await syncEveryone(host, NOW);

    expect(host.http.fetch).not.toHaveBeenCalled();

    stored.set('import:p1', aJob(hoursAgo(30)));

    expect(await syncEveryone(host, NOW)).toBe(1);
    expect(host.http.fetch).toHaveBeenCalled();
  });

  it('logs a list that fails, and carries on with everyone else', async () => {
    const { host, stored } = aHost({
      profiles: [
        { id: 'p1', name: 'Marques' },
        { id: 'p2', name: 'Guest' },
      ],
      connections: {
        'p1:anilist': { accessToken: 'a', account: null },
        'p2:anilist': { accessToken: 'b', account: null },
      },
      answers: aniListAnswers([anAniListEntry()]),
    });

    stored.set('import:p1', aJob(null, [anEntry]));
    stored.set('import:p2', aJob(null, [anEntry]));
    host.library.findByExternalId.mockRejectedValueOnce(new Error('library offline'));

    expect(await syncEveryone(host, NOW)).toBe(1);
    expect(host.log.warn).toHaveBeenCalledWith('Could not sync an anime list', {
      profile: 'p1',
      problem: 'library offline',
    });
    expect(stored.get('import:p2')).toMatchObject({ finishedAt: NOW.toISOString() });
  });

  it('starts nobody once the run’s time is up, and starts from the next person next time', async () => {
    const { host, stored } = aHost({
      profiles: [
        { id: 'p1', name: 'Marques' },
        { id: 'p2', name: 'Guest' },
      ],
      connections: { 'p2:anilist': { accessToken: 'b', account: null } },
      answers: aniListAnswers([anAniListEntry()]),
    });

    stored.set('import:p2', aJob(null, [anEntry]));

    expect(await syncEveryone(host, NOW, 0)).toBe(0);
    expect(stored.get('syncStartsFrom')).toBe(0);

    expect(await syncEveryone(host, NOW)).toBe(1);
    expect(stored.get('syncStartsFrom')).toBe(0);

    stored.set('syncStartsFrom', 1);
    await syncEveryone(host, NOW);

    expect(host.profiles.list).toHaveBeenCalledTimes(3);
  });

  it('lets go of removed profiles and what earlier versions kept per episode', async () => {
    const { host, stored } = aHost({ profiles: [{ id: 'p1', name: 'Marques' }] });

    stored.set('import:gone', aJob(hoursAgo(2)));
    stored.set('link:gone:example', { entries: [] });
    stored.set('preferences:gone', { twoWay: true });
    stored.set('episode:p1:e1', { anilistId: '1', malId: null, number: 1, episodes: 12 });
    stored.set('series:example', { anilistId: '1', malId: null, title: 'x' });
    stored.set('link:p1:example', { entries: [] });

    await syncEveryone(host, NOW);

    expect([...stored.keys()].sort()).toEqual(['link:p1:example', 'syncStartsFrom']);
  });

  it('reads again at once an import made before seasons were matched', async () => {
    const { host, stored } = aHost({
      connections: { 'p1:anilist': { accessToken: 'a', account: null } },
      answers: aniListAnswers([anAniListEntry()]),
    });
    const { isLinked: _dropped, ...before } = aJob(hoursAgo(2));

    stored.set('import:p1', before);
    await syncEveryone(host, NOW);

    expect(stored.get('import:p1')).toMatchObject({ isLinked: true });
  });
});
