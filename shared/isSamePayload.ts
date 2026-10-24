import { gunzipSync } from 'node:zlib';

/**
 * Whether two packed plugins hold the same thing, comparing what they unpack to, since zlib on a Mac
 * and on the CI's Linux compress the same bytes differently and stamp their own system in the
 * header.
 *
 * @param left - One `.vplugin`.
 * @param right - The other.
 * @returns Whether they unpack to the same bytes.
 */
const isSamePayload = (left: Uint8Array, right: Uint8Array): boolean =>
  gunzipSync(left).equals(gunzipSync(right));

export { isSamePayload };
