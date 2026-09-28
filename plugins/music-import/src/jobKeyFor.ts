/**
 * Where somebody's playlist import is kept in the plugin's storage.
 *
 * @param profileId - Whose import.
 * @returns The storage key.
 */
const jobKeyFor = (profileId: string): string => `import:${profileId}`;

export { jobKeyFor };
