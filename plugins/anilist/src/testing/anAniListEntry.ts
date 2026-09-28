/**
 * One show on an AniList list, as AniList sends it.
 *
 * @param changes - What this test changes.
 * @returns The entry.
 */
const anAniListEntry = (
  changes: { id?: number; progress?: number; title?: string; year?: number } = {},
) => ({
  status: 'CURRENT',
  progress: changes.progress ?? 3,
  media: {
    id: changes.id ?? 154_587,
    idMal: changes.id === undefined ? 52_991 : changes.id + 100_000,
    episodes: 28,
    seasonYear: changes.year ?? 2023,
    title: {
      romaji: 'Sousou no Frieren',
      english: changes.title ?? 'Frieren: Beyond Journey’s End',
      native: null,
    },
    synonyms: ['Frieren'],
  },
});

export { anAniListEntry };
