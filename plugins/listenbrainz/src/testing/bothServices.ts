import { lastfmAnswers } from './lastfmAnswers';
import { listenBrainzAnswers } from './listenBrainzAnswers';

type Answers = (
  url: string,
  init: { method?: string; headers?: Record<string, string>; body?: string },
) => { status: number; text: string };

/**
 * A web that answers ListenBrainz and Last.fm, each as a test sets it up.
 *
 * @param listenBrainz - How ListenBrainz answers.
 * @param lastfm - How Last.fm answers.
 * @returns The web.
 */
const bothServices =
  (listenBrainz: Answers = listenBrainzAnswers(), lastfm: Answers = lastfmAnswers()): Answers =>
  (url, init) =>
    url.startsWith('https://api.listenbrainz.org') ? listenBrainz(url, init) : lastfm(url, init);

export { bothServices };
