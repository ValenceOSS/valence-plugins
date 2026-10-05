import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { actOnOutcome } from './actOnOutcome';
import type { PendingScrobbles } from './PendingScrobble';
import { PendingScrobblesSchema } from './PendingScrobble';
import { pendingKeyFor } from './pendingKeyFor';
import { readLastfmKeys } from './readLastfmKeys';
import { readLinks } from './readLinks';
import { sendToLastfm } from './sendToLastfm';
import { sendToListenBrainz } from './sendToListenBrainz';
import type { SendOutcome } from './SendOutcome';
import type { Service } from './Service';

/** The most scrobbles kept waiting; past this the oldest go, which Last.fm would refuse anyway. */
const MOST_KEPT = 500;

/** How long one run keeps sending, well inside the 30 seconds Valence gives each call. */
const BUDGET_MS = 8000;

/**
 * Sends somebody's waiting scrobbles, adding any new ones after them, oldest first as Last.fm
 * asks. A service that is not reached keeps the rest of its scrobbles for the next try; one that
 * refuses Valence's sign-in is disconnected, and its scrobbles dropped. What else becomes of each is
 * `actOnOutcome`'s.
 *
 * @param valence - The host.
 * @param profileId - Whose scrobbles.
 * @param adding - New scrobbles to send after the waiting ones.
 * @param budgetMs - How long to keep sending; the rest wait for the next run.
 * @returns How many are still waiting.
 */
const sendScrobbles = async (
  valence: ValenceHost,
  profileId: string,
  adding: PendingScrobbles = [],
  budgetMs: number = BUDGET_MS,
): Promise<number> => {
  const read = PendingScrobblesSchema.safeParse(
    await valence.storage.get(pendingKeyFor(profileId)),
  );
  const stored = read.success ? read.data : [];
  const waiting = [...stored, ...adding];

  if (waiting.length === 0) {
    return 0;
  }

  const links = await readLinks(valence, profileId);
  const keys = await readLastfmKeys(valence);
  const stopped = new Map<Service, SendOutcome['kind']>();
  const kept: PendingScrobbles = [];
  const started = Date.now();

  for (const each of waiting) {
    const link = links[each.service];

    if (link === null || stopped.get(each.service) === 'signedOut') {
      continue;
    }

    if (stopped.get(each.service) === 'busy' || Date.now() - started > budgetMs) {
      kept.push(each);

      continue;
    }

    const outcome: SendOutcome =
      each.service === 'listenbrainz' && links.listenbrainz !== null
        ? await sendToListenBrainz(valence, links.listenbrainz, each.listen, false)
        : each.service === 'lastfm' && links.lastfm !== null && keys !== null
          ? await sendToLastfm(valence, keys, links.lastfm, each.listen, false)
          : { kind: 'refused', reason: 'Last.fm is not set up on this server', isTheirs: false };

    if (outcome.kind === 'busy') {
      kept.push(each);
    }

    if (outcome.kind === 'busy' || outcome.kind === 'signedOut') {
      stopped.set(each.service, outcome.kind);
    }

    await actOnOutcome(valence, profileId, each.service, outcome);
  }

  if (kept.length > 0 || stored.length > 0) {
    await valence.storage.set(pendingKeyFor(profileId), kept.slice(-MOST_KEPT));
  }

  return kept.length;
};

export { sendScrobbles };
