import type { Answering } from './Answering';
import type { SubsonicReply } from './subsonicAnswer';
import { SUBSONIC_ERROR } from './SUBSONIC_ERROR';

/**
 * A scrobble. One that isn't a submission says what the app has started playing, which shows on
 * the person's devices in Valence until the song would have ended. A submission counts each song
 * as played at the time the app gives, so songs played offline count from when they were heard;
 * one Valence won't count, such as a song since removed, is passed over rather than failing the rest.
 *
 * @param answering - The person, what they asked, and how to answer.
 * @returns The answer.
 */
const answerScrobble = async ({
  valence,
  person,
  asked,
  ok,
  failed,
}: Answering): Promise<SubsonicReply> => {
  const ids = asked.texts('id');
  const times = asked.texts('time');

  if (ids.length === 0) {
    return failed(SUBSONIC_ERROR.missing, 'Say which song with id.');
  }

  if (asked.text('submission') === 'false') {
    try {
      await valence.music.nowPlaying(person.profileId, {
        trackId: ids[0] ?? '',
        client: asked.text('c') ?? '',
      });
    } catch {
      return failed(SUBSONIC_ERROR.notFound, 'There is no such song.');
    }

    return ok();
  }

  for (const [at, id] of ids.entries()) {
    const time = Number(times[at] ?? Number.NaN);

    await valence.music
      .recordPlay(
        person.profileId,
        id,
        Number.isFinite(time) && time > 0 ? new Date(time).toISOString() : undefined,
      )
      .catch(() => undefined);
  }

  return ok();
};

export { answerScrobble };
