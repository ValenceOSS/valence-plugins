import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { continueMusicImport } from './continueMusicImport';

/**
 * The scheduled run: carries on every playlist import that is under way, so a long playlist
 * finishes even when nobody keeps the page open.
 *
 * @param valence - The host.
 * @param now - The time now.
 * @returns How many imports moved on.
 */
const continueEveryone = async (valence: ValenceHost, now: Date = new Date()): Promise<number> => {
  let moved = 0;

  for (const profile of await valence.profiles.list()) {
    try {
      const job = await continueMusicImport(valence, profile.id, now);

      moved += job === null ? 0 : 1;
    } catch (failure) {
      valence.log.warn('Could not carry on a playlist import', {
        profile: profile.id,
        problem: failure instanceof Error ? failure.message : 'unknown',
      });
    }
  }

  return moved;
};

export { continueEveryone };
