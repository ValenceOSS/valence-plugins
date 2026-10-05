type PlaylistLink =
  { source: 'spotify'; id: string } | { source: 'apple'; id: string; storefront: string };

const HTTPS_ADDRESS = /^https:\/\/([a-z0-9.-]+)(?::443)?(\/[^?#]*)?(?:[?#].*)?$/iu;

/**
 * Reads a playlist's share link from Spotify or Apple Music, without `URL`, which a plugin's
 * sandbox does not have.
 *
 * @param link - What somebody pasted.
 * @returns Which service and which playlist, or nothing where it is not a playlist link.
 */
const readPlaylistLink = (link: string): PlaylistLink | null => {
  const address = HTTPS_ADDRESS.exec(link.trim());
  const hostname = address?.[1]?.toLowerCase();
  const parts = (address?.[2] ?? '').split('/').filter((part) => part !== '');

  if (hostname === 'open.spotify.com') {
    const at = parts.indexOf('playlist');
    const id = parts[at + 1];

    return at >= 0 && id !== undefined && /^[A-Za-z0-9]{10,40}$/u.test(id)
      ? { source: 'spotify', id }
      : null;
  }

  if (hostname === 'music.apple.com') {
    const [storefront, kind] = parts;
    const id = parts.at(-1);

    return storefront !== undefined &&
      /^[a-z]{2}$/u.test(storefront) &&
      kind === 'playlist' &&
      id !== undefined &&
      /^pl\.[A-Za-z0-9-]{8,64}$/u.test(id)
      ? { source: 'apple', id, storefront }
      : null;
  }

  return null;
};

export type { PlaylistLink };

export { readPlaylistLink };
