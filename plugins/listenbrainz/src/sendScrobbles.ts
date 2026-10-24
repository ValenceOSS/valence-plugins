import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { actOnOutcome } from './actOnOutcome';
import type { Listen } from './Listen';
import type { PendingScrobble } from './PendingScrobble';
import { PendingScrobbleSchema, PendingScrobblesSchema } from './PendingScrobble';
import { pendingKeyFor } from './pendingKeyFor';
import { readLastfmKeys } from './readLastfmKeys';
import { readLinks } from './readLinks';
import { sendToLastfm } from './sendToLastfm';
import { sendToListenBrainz } from './sendToListenBrainz';
import { SENDING } from './SENDING';
import type { SendOutcome } from './SendOutcome';
import type { Service } from './Service';

/** The most scrobbles kept waiting per service; past this the oldest go, which Last.fm would refuse
 * anyway. */
const MOST_KEPT = 500;

/** How many each service takes in one call. */
const AT_ONCE: Record<Service, number> = { listenbrainz: 100, lastfm: 50 };

/**
 * Whether a song is one Last.fm takes none of, which is refused on its own rather than with the
 * rest of a batch.
 *
 * @param service - Where it is going.
 * @param listen - The song.
 * @returns Whether it is too short for that service.
 */
const isTooShortFor = (service: Service, listen: Listen | undefined): boolean =>
  service === 'lastfm' && listen?.durationSeconds !== null && (listen?.durationSeconds ?? 31) <= 30;

/** How long one run keeps sending, well inside the 30 seconds Valence gives each call. */
const BUDGET_MS = 8000;

/**
 * Sends what is waiting, once `sendScrobbles` is sure nothing else is sending the same person's.
 *
 * @param valence - The host.
 * @param profileId - Whose scrobbles.
 * @param budgetMs - How long to keep sending.
 * @returns How many are still waiting.
 */
const sendWaiting = async (
  valence: ValenceHost,
  profileId: string,
  budgetMs: number,
): Promise<number> => {
  const keys = (await valence.storage.keys(pendingKeyFor(profileId))).sort();

  if (keys.length === 0) {
    return 0;
  }

  const links = await readLinks(valence, profileId);
  const lastfmKeys = await readLastfmKeys(valence);
  const started = Date.now();
  let waiting = 0;

  for (const service of ['listenbrainz', 'lastfm'] as const) {
    const ours = keys.filter((key) => key.startsWith(`${pendingKeyFor(profileId)}${service}:`));

    for (const key of ours.slice(0, Math.max(0, ours.length - MOST_KEPT))) {
      await valence.storage.delete(key);
    }

    const queue = ours.slice(-MOST_KEPT);

    if (links[service] === null) {
      for (const key of queue) {
        await valence.storage.delete(key);
      }

      continue;
    }

    let isStopped = false;

    for (let at = 0; at < queue.length && !isStopped; at += AT_ONCE[service]) {
      if (Date.now() - started > budgetMs) {
        break;
      }

      const read = await Promise.all(
        queue.slice(at, at + AT_ONCE[service]).map(async (key) => ({
          key,
          read: PendingScrobbleSchema.safeParse(await valence.storage.get(key)),
        })),
      );

      for (const { key } of read.filter((each) => !each.read.success)) {
        await valence.storage.delete(key);
      }

      const batch = read.flatMap(({ key, read: each }) =>
        each.success ? [{ key, listen: each.data.listen }] : [],
      );
      const listens = batch.map((each) => each.listen);

      if (listens.length === 0) {
        continue;
      }

      const sendOne = async (listen: Listen): Promise<SendOutcome> =>
        service === 'listenbrainz' && links.listenbrainz !== null
          ? sendToListenBrainz(valence, links.listenbrainz, [listen], false)
          : links.lastfm !== null && lastfmKeys !== null
            ? ((await sendToLastfm(valence, lastfmKeys, links.lastfm, [listen], false))[0] ?? {
                kind: 'busy',
              })
            : { kind: 'misconfigured', reason: 'Last.fm is not set up on this server' };
      const together: SendOutcome[] =
        service === 'listenbrainz' && links.listenbrainz !== null
          ? await sendToListenBrainz(valence, links.listenbrainz, listens, false).then((each) =>
              listens.map(() => each),
            )
          : links.lastfm !== null && lastfmKeys !== null
            ? await sendToLastfm(valence, lastfmKeys, links.lastfm, listens, false)
            : listens.map(() => ({
                kind: 'misconfigured',
                reason: 'Last.fm is not set up on this server',
              }));
      const tried = together.filter((_, index) => !isTooShortFor(service, listens[index]));
      const first = tried[0];
      const isRefusedWhole =
        tried.length > 1 &&
        first?.kind === 'refused' &&
        !first.isTheirs &&
        tried.every((each) => each.kind === 'refused' && each.reason === first.reason);
      const outcomes: SendOutcome[] = [];

      if (isRefusedWhole) {
        for (const listen of listens) {
          const outcome = await sendOne(listen);

          outcomes.push(outcome);

          if (
            (outcome.kind !== 'sent' && outcome.kind !== 'refused') ||
            Date.now() - started > budgetMs
          ) {
            break;
          }
        }
      } else {
        outcomes.push(...together);
      }

      for (const [index, { key }] of batch.entries()) {
        const outcome = outcomes[index] ?? { kind: 'busy' };

        if (outcome.kind === 'sent' || outcome.kind === 'refused' || outcome.kind === 'signedOut') {
          await valence.storage.delete(key);
        }
      }

      const worst =
        outcomes.find((each) => each.kind === 'signedOut') ??
        outcomes.find((each) => each.kind === 'misconfigured') ??
        outcomes.find((each) => each.kind === 'busy');

      for (const outcome of outcomes.filter((each) => each.kind === 'refused')) {
        await actOnOutcome(valence, profileId, service, outcome);
      }

      if (worst !== undefined) {
        await actOnOutcome(valence, profileId, service, worst);
        isStopped = true;
      } else if (outcomes.some((each) => each.kind === 'sent')) {
        await actOnOutcome(valence, profileId, service, { kind: 'sent' });
      }
    }

    waiting += (await valence.storage.keys(`${pendingKeyFor(profileId)}${service}:`)).length;
  }

  return waiting;
};

/**
 * Sends somebody's waiting scrobbles, oldest first as Last.fm asks, several to a call. Each new one
 * is kept under its own key before anything is sent, and each is let go only once sent or refused
 * for good, so nothing is lost when a run fails and two runs at once never drop or double one. A
 * service that is not reached keeps the rest for the next try; one that refuses the person's sign-
 * in is disconnected and its scrobbles dropped; one whose setup on this server is broken keeps them
 * until an administrator puts it right. Only one run sends a person's scrobbles at a time. What
 * else becomes of each is `actOnOutcome`'s.
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
  adding: readonly PendingScrobble[] = [],
  budgetMs: number = BUDGET_MS,
): Promise<number> => {
  for (const each of adding) {
    await valence.storage.set(pendingKeyFor(profileId, each), each);
  }

  if (SENDING.has(profileId)) {
    return (await valence.storage.keys(pendingKeyFor(profileId))).length;
  }

  SENDING.add(profileId);

  try {
    const legacy = PendingScrobblesSchema.safeParse(
      await valence.storage.get(`pending:${profileId}`),
    );

    if (legacy.success) {
      for (const each of legacy.data) {
        await valence.storage.set(pendingKeyFor(profileId, each), each);
      }

      await valence.storage.delete(`pending:${profileId}`);
    }

    return await sendWaiting(valence, profileId, budgetMs);
  } finally {
    SENDING.delete(profileId);
  }
};

export { sendScrobbles };
