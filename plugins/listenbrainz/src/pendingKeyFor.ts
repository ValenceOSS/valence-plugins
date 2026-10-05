/**
 * Where somebody's scrobbles waiting to be sent are kept.
 *
 * @param profileId - Whose.
 * @returns The storage key.
 */
const pendingKeyFor = (profileId: string): string => `pending:${profileId}`;

export { pendingKeyFor };
