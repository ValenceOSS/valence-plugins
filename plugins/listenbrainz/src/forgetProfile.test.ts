import { aHost } from '@Shared/testing/aHost';
import { forgetProfile } from './forgetProfile';
import { updateEveryone } from './updateEveryone';

describe('forgetProfile', () => {
  it('lets go of everything kept for a removed profile, and only theirs', async () => {
    const { host, stored } = aHost({ profiles: [{ id: 'p1', name: 'Marques' }] });

    for (const key of [
      'listenbrainz:gone',
      'lastfm-sign-in:gone',
      'pending:gone:lastfm:000000000100',
      'told:gone:lastfm',
      'preferences:gone',
      'kept:gone:weekly-jams',
      'requestMissing:gone:weekly-jams',
      'preferences:p1',
    ]) {
      stored.set(key, { user: 'x' });
    }

    await forgetProfile(host, 'gone');

    expect([...stored.keys()]).toEqual(['preferences:p1']);
  });

  it('is done by the scheduled run for a profile found gone', async () => {
    const { host, stored } = aHost({ profiles: [{ id: 'p1', name: 'Marques' }] });

    stored.set('listenbrainz:gone', { user: 'x' });
    stored.set('pending:gone:listenbrainz:000000000100', { user: 'x' });
    await updateEveryone(host, new Date('2026-10-05T12:00:00.000Z'));

    expect([...stored.keys()]).toEqual([]);
  });
});
