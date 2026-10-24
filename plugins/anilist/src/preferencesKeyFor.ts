/**
 * Where somebody's choices for their lists are kept.
 *
 * @param profileId - Whose choices.
 * @returns The storage key.
 */
const preferencesKeyFor = (profileId: string): string => `preferences:${profileId}`;

export { preferencesKeyFor };
