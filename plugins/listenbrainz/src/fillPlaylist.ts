import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import type { PlaylistItem } from './PlaylistItem';

/** The most songs Valence adds to a playlist in one call. */
const MOST_ADDED_AT_ONCE = 500;

/**
 * The key a missing song goes by, the same whatever the case of its title and artist.
 *
 * @param song - The song.
 * @returns Its key.
 */
const missingKeyOf = (song: { title: string; artist: string }): string =>
  `missing:${song.title.toLowerCase()}\n${song.artist.toLowerCase()}`;

/**
 * What a wanted song is, to tell whether an entry already holds it.
 *
 * @param item - The song.
 * @returns Its key.
 */
const wantedKeyOf = (item: PlaylistItem): string =>
  typeof item === 'string' ? `media:${item}` : missingKeyOf(item);

/**
 * What an entry holds: a song from the library, a song still missing, or nothing, where its song
 * has left the library.
 *
 * @param entry - The entry.
 * @returns Its key, or nothing for an entry whose song has gone.
 */
const heldKeyOf = (entry: {
  mediaId: string | null;
  missing: { title: string; artist: string } | null;
}): string | null =>
  entry.mediaId !== null
    ? `media:${entry.mediaId}`
    : entry.missing === null
      ? null
      : missingKeyOf(entry.missing);

/**
 * Brings a playlist's entries from the plugin in line with the songs wanted, missing ones included,
 * leaving the person's own additions alone: an entry still wanted stays where it is, one no longer
 * wanted is removed, and the songs not yet there are added at the end, in order. An entry Valence
 * has since filled in with the song it was missing counts as that song.
 *
 * @param valence - The host.
 * @param profileId - Whose playlist.
 * @param playlistId - Which.
 * @param ours - The entries the plugin put there last time.
 * @param wanted - The songs it should now hold, in order.
 * @returns The plugin's entries as they now stand.
 */
const fillPlaylist = async (
  valence: ValenceHost,
  profileId: string,
  playlistId: string,
  ours: readonly string[],
  wanted: readonly PlaylistItem[],
): Promise<string[]> => {
  const owed = new Map<string, number>();

  for (const item of wanted) {
    const key = wantedKeyOf(item);

    owed.set(key, (owed.get(key) ?? 0) + 1);
  }

  const before = await valence.playlists.read(profileId, playlistId);
  const present = new Map(
    (before?.entries ?? []).map((entry) => [entry.entryId, heldKeyOf(entry)]),
  );
  const staying: string[] = [];

  for (const entryId of ours.filter((each) => present.has(each))) {
    const key = present.get(entryId) ?? null;
    const count = key === null ? 0 : (owed.get(key) ?? 0);

    if (key !== null && count > 0) {
      owed.set(key, count - 1);
      staying.push(entryId);
    } else {
      await valence.playlists.drop(profileId, playlistId, entryId);
      present.delete(entryId);
    }
  }

  const adding = wanted.filter((item) => {
    const key = wantedKeyOf(item);
    const count = owed.get(key) ?? 0;

    owed.set(key, count - 1);

    return count > 0;
  });

  for (let at = 0; at < adding.length; at += MOST_ADDED_AT_ONCE) {
    await valence.playlists.add(profileId, playlistId, adding.slice(at, at + MOST_ADDED_AT_ONCE));
  }

  if (adding.length === 0) {
    return staying;
  }

  const after = await valence.playlists.read(profileId, playlistId);
  const added = (after?.entries ?? []).flatMap((entry) =>
    present.has(entry.entryId) ? [] : [entry.entryId],
  );

  return [...staying, ...added];
};

export { fillPlaylist };
