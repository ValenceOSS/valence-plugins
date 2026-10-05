/**
 * Where a kept playlist, and an update to it under way, are kept.
 *
 * @param profileId - Whose playlist.
 * @param sourceId - Which service playlist it follows.
 * @returns The two storage keys.
 */
const playlistKeysFor = (
  profileId: string,
  sourceId: string,
): { kept: string; update: string } => ({
  kept: `kept:${profileId}:${sourceId}`,
  update: `update:${profileId}:${sourceId}`,
});

export { playlistKeysFor };
