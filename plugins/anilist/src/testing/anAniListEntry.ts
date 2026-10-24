/**
 * One show on an AniList list, as AniList sends it: the first season of a made-up show unless the
 * test says otherwise.
 *
 * @param changes - What this test changes.
 * @returns The entry.
 */
const anAniListEntry = (
  changes: {
    id?: number;
    status?: string;
    progress?: number;
    episodes?: number;
    title?: string;
    year?: number;
  } = {},
) => ({
  status: changes.status ?? 'CURRENT',
  progress: changes.progress ?? 3,
  media: {
    id: changes.id ?? 1001,
    idMal: changes.id === undefined ? 2001 : changes.id + 1000,
    episodes: changes.episodes ?? 12,
    seasonYear: changes.year ?? 2023,
    title: {
      romaji: 'Rei no Bouken',
      english: changes.title ?? 'Example Quest',
      native: null,
    },
    synonyms: ['Example'],
  },
});

export { anAniListEntry };
