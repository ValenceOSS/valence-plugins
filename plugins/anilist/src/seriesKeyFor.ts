/**
 * Where a programme's match on the lists is kept, for its panel.
 *
 * @param seriesId - The programme.
 * @returns The storage key.
 */
const seriesKeyFor = (seriesId: string): string => `series:${seriesId}`;

export { seriesKeyFor };
