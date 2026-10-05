import { md5 } from '@Shared/md5';

/**
 * Last.fm's signature for a call: every parameter by name in order, each name followed by its
 * value, then the shared secret, digested with MD5.
 *
 * @param params - The call's parameters, without `format`.
 * @param secret - The shared secret.
 * @returns The signature.
 */
const lastfmSignatureOf = (params: Record<string, string>, secret: string): string =>
  md5(
    Object.keys(params)
      .sort()
      .map((name) => `${name}${params[name] ?? ''}`)
      .join('') + secret,
  );

export { lastfmSignatureOf };
