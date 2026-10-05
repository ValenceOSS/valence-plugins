import { aHost } from '@Shared/testing/aHost';
import { startHistoryJob } from './startHistoryJob';
import { syncEveryone } from './syncEveryone';
import { aFilmPlay } from './testing/aTraktPlay';
import { traktAnswers } from './testing/traktAnswers';

const NOW = new Date('2026-10-05T12:00:00.000Z');

const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * 3_600_000);

describe('syncEveryone', () => {
  it('imports for somebody connected who never imported, and skips people without Trakt', async () => {
    const { host, stored } = aHost({
      settings: { traktClientId: 'client' },
      profiles: [
        { id: 'p1', name: 'Marques' },
        { id: 'p2', name: 'Guest' },
      ],
      connections: { 'p1:trakt': { accessToken: 't', account: null } },
      answers: traktAnswers([aFilmPlay()]),
    });

    expect(await syncEveryone(host, NOW)).toBe(1);
    expect(stored.get('import:p1')).toMatchObject({ finishedAt: NOW.toISOString() });
    expect(stored.has('import:p2')).toBe(false);
  });

  it('reads the plays since the last read once a day, and leaves a recent read alone', async () => {
    const { host, stored } = aHost({
      settings: { traktClientId: 'client' },
      connections: { 'p1:trakt': { accessToken: 't', account: null } },
      answers: traktAnswers([]),
    });

    await startHistoryJob(host, 'import', 'p1', null, hoursAgo(30));
    stored.set('import:p1', {
      ...(stored.get('import:p1') as object),
      finishedAt: hoursAgo(30).toISOString(),
    });
    await startHistoryJob(host, 'sync', 'p1', null, hoursAgo(2));
    stored.set('sync:p1', {
      ...(stored.get('sync:p1') as object),
      finishedAt: hoursAgo(2).toISOString(),
    });

    expect(await syncEveryone(host, NOW)).toBe(0);
    expect(host.http.fetch).not.toHaveBeenCalled();

    expect(await syncEveryone(host, new Date(NOW.getTime() + 23 * 3_600_000))).toBe(1);
    expect(stored.get('sync:p1')).toMatchObject({ since: hoursAgo(3).toISOString() });
  });

  it('logs a history that fails, and carries on with everyone else', async () => {
    const { host } = aHost({
      settings: { traktClientId: 'client' },
      connections: { 'p1:trakt': { accessToken: 't', account: null } },
      answers: () => ({ status: 429, text: '' }),
    });

    expect(await syncEveryone(host, NOW)).toBe(0);
    expect(host.log.warn).toHaveBeenCalledWith('Could not sync a Trakt history', {
      profile: 'p1',
      problem: 'Trakt answered 429',
    });
  });
});
