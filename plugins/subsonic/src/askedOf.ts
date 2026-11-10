import type { RouteRequest } from '@ValenceSDK/host/PluginDefinition';
import type { Asked } from './Asked';

/**
 * Reads one part of a form as it was meant, or as it came where it isn't properly encoded.
 *
 * @param part - The encoded part.
 * @returns What it says.
 */
const decoded = (part: string): string => {
  const spaced = part.replace(/\+/gu, ' ');

  try {
    return decodeURIComponent(spaced);
  } catch {
    return spaced;
  }
};

/**
 * Reads what a Subsonic app asked, from the query and from a form it posted, where a parameter may
 * be given more than once, as the ids of several songs to star are.
 *
 * @param request - The request.
 * @returns How to read each parameter.
 */
const askedOf = (request: RouteRequest): Asked => {
  const form = new Map<string, string[]>();

  if (request.headers['content-type']?.startsWith('application/x-www-form-urlencoded') === true) {
    for (const pair of request.body.split('&')) {
      if (pair !== '') {
        const [name = '', value = ''] = pair.split('=');
        const key = decoded(name);

        form.set(key, [...(form.get(key) ?? []), decoded(value)]);
      }
    }
  }

  const texts = (name: string): string[] => [
    ...(request.query[name] ?? []),
    ...(form.get(name) ?? []),
  ];
  const text = (name: string): string | null => texts(name)[0] ?? null;

  return {
    text,
    texts,
    number: (name, fallback, most) => {
      const read = Number(text(name) ?? Number.NaN);

      return Number.isInteger(read) && read >= 0 ? Math.min(read, most) : fallback;
    },
  };
};

export { askedOf };
