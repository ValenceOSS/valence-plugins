/**
 * Where the list entries somebody's import matched to a programme are kept, one per season the
 * lists count, so watching it can be passed back and its panel can show them.
 *
 * @param profileId - Whose lists.
 * @param seriesId - The programme.
 * @returns The storage key.
 */
const linkKeyFor = (profileId: string, seriesId: string): string => `link:${profileId}:${seriesId}`;

export { linkKeyFor };
