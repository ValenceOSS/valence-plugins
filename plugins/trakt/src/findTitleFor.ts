import type { MediaRef, ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { normaliseTitle } from '@Shared/normaliseTitle';
import type { TraktTitle } from './TraktWatch';

/**
 * Finds the film or programme in the library that a Trakt title is: by its TMDB id, then its IMDb
 * id, which for a programme its episodes carry, and otherwise by a title that matches exactly once normalised, in a year no more than one
 * out, so a similar name is never mistaken for it.
 *
 * @param valence - The host.
 * @param profileId - Whose library it is looked for in.
 * @param title - The film or show on Trakt.
 * @param kind - Which it is.
 * @returns The library's id for it, or nothing where the library has no clear match.
 */
const findTitleFor = async (
  valence: ValenceHost,
  profileId: string,
  title: TraktTitle,
  kind: 'film' | 'series',
): Promise<string | null> => {
  const reading = { profileId };
  const byTmdb =
    title.tmdb === null
      ? undefined
      : (await valence.library.findByExternalId('tmdb', title.tmdb, reading)).find(
          (media) => media.kind === kind,
        );

  if (byTmdb !== undefined) {
    return byTmdb.id;
  }

  const byImdb =
    title.imdb === null
      ? undefined
      : (await valence.library.findByExternalId('imdb', title.imdb, reading)).find((media) =>
          kind === 'film'
            ? media.kind === 'film'
            : media.kind === 'episode' && media.seriesId !== null,
        );

  if (byImdb !== undefined) {
    return kind === 'film' ? byImdb.id : byImdb.seriesId;
  }

  const wanted = normaliseTitle(title.title);
  const matches = (await valence.library.search(title.title, [kind], reading)).filter(
    (media: MediaRef) =>
      normaliseTitle(media.title) === wanted &&
      (title.year === null || media.year === null || Math.abs(media.year - title.year) <= 1),
  );

  return matches.length === 1 ? (matches[0]?.id ?? null) : null;
};

export { findTitleFor };
