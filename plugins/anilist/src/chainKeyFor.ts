/**
 * Where the seasons before a show are kept once AniList has said what they are.
 *
 * @param provider - Which list the show's id is from.
 * @param id - Its id there.
 * @returns The storage key.
 */
const chainKeyFor = (provider: 'anilist' | 'mal', id: string): string => `chain:${provider}:${id}`;

export { chainKeyFor };
