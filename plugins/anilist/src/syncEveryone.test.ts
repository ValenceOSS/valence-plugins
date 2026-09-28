import { aHost } from '@Shared/testing/aHost';
import { syncEveryone } from './syncEveryone';
import { aniListAnswers } from './testing/aniListAnswers';
import { anAniListEntry } from './testing/anAniListEntry';

const NOW = new Date('2026-09-28T12:00:00.000Z');

describe('syncEveryone', () => {
  it('starts a fresh import for somebody connected with none, and skips people without a list', async () => {
    const { host, stored } = aHost({
      profiles: [
        { id: 'p1', name: 'Marques' },
        { id: 'p2', name: 'Guest' },
      ],
      connections: { 'p1:anilist': { accessToken: 'a', account: null } },
      answers: aniListAnswers([anAniListEntry()]),
    });

    expect(await syncEveryone(host, NOW)).toBe(1);
    expect(stored.has('import:p1')).toBe(true);
    expect(stored.has('import:p2')).toBe(false);
  });

  it('starts again once a finished import is a day old, and leaves a recent one alone', async () => {
    const { host, stored } = aHost({
      connections: { 'p1:anilist': { accessToken: 'a', account: null } },
      answers: aniListAnswers([anAniListEntry()]),
    });
    const finishedAt = (hours: number) => new Date(NOW.getTime() - hours * 3_600_000).toISOString();
    const finished = (hours: number) => ({
      entries: [],
      next: 0,
      matched: 0,
      marked: 0,
      unmatched: [],
      startedAt: finishedAt(hours),
      finishedAt: finishedAt(hours),
    });

    stored.set('import:p1', finished(2));
    await syncEveryone(host, NOW);

    expect(host.http.fetch).not.toHaveBeenCalled();

    stored.set('import:p1', finished(30));
    await syncEveryone(host, NOW);

    expect(host.http.fetch).toHaveBeenCalled();
  });

  it('logs a list that fails, and carries on with everyone else', async () => {
    const { host, stored } = aHost({
      connections: { 'p1:anilist': { accessToken: 'a', account: null } },
      answers: aniListAnswers([anAniListEntry()]),
    });

    stored.set('import:p1', {
      entries: [
        {
          provider: 'anilist',
          id: '1',
          anilistId: '1',
          malId: null,
          titles: ['x'],
          year: null,
          progress: 1,
          episodes: null,
          status: 'watching',
        },
      ],
      next: 0,
      matched: 0,
      marked: 0,
      unmatched: [],
      startedAt: NOW.toISOString(),
      finishedAt: null,
    });
    host.library.findByExternalId.mockRejectedValueOnce(new Error('library offline'));

    expect(await syncEveryone(host, NOW)).toBe(0);
    expect(host.log.warn).toHaveBeenCalledWith('Could not sync an anime list', {
      profile: 'p1',
      problem: 'library offline',
    });
  });
});
