/**
 * Where the Trakt username somebody connected as is kept, for the page to show.
 *
 * @param profileId - Whose account.
 * @returns The storage key.
 */
const accountKeyFor = (profileId: string): string => `account:${profileId}`;

export { accountKeyFor };
