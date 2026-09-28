/**
 * Where what an episode is on somebody's lists is kept, so watching it can be passed back.
 *
 * @param profileId - Whose lists.
 * @param mediaId - The episode.
 * @returns The storage key.
 */
const episodeKeyFor = (profileId: string, mediaId: string): string =>
  `episode:${profileId}:${mediaId}`;

export { episodeKeyFor };
