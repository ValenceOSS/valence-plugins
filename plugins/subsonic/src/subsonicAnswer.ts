import { SUBSONIC_VERSION } from './SUBSONIC_VERSION';
import type { SubsonicBody, SubsonicValue } from './SubsonicBody';
import { toXml } from './toXml';

type Format = 'json' | 'xml';

/**
 * Answers a Subsonic app the way a Subsonic server does, in JSON or in XML as it asked, leaving out
 * what isn't known rather than saying null, as Subsonic servers do.
 *
 * @param format - Which the app asked for.
 * @param body - What the answer holds besides its status.
 * @param error - The error to answer with instead, if there is one.
 * @returns The answer for Valence to send.
 */
const subsonicAnswer = (
  format: Format,
  body: SubsonicBody,
  error: { code: number; message: string } | null = null,
) => {
  const response: SubsonicBody = {
    status: error === null ? 'ok' : 'failed',
    version: SUBSONIC_VERSION,
    type: 'valence',
    serverVersion: '1.0.0',
    openSubsonic: true,
    ...(error === null ? body : { error }),
  };

  return format === 'json'
    ? {
        status: 200,
        contentType: 'application/json' as const,
        body: JSON.stringify({ 'subsonic-response': response }, (key, value: SubsonicValue) =>
          key !== '' && value === null ? undefined : value,
        ),
      }
    : {
        status: 200,
        contentType: 'application/xml' as const,
        body: `<?xml version="1.0" encoding="UTF-8"?>${toXml('subsonic-response', {
          xmlns: 'http://subsonic.org/restapi',
          ...response,
        })}`,
      };
};

export type { Format };

export { subsonicAnswer };
