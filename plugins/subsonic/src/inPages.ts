const HOST_PAGE = 200;

const MOST_OFFSET = 1_000_000;

/**
 * Reads as many as an app asked for from a host call that answers at most 200 at a time, a page
 * after another from where the app asked to start, stopping early where the library runs out.
 *
 * @param offset - Where the app asked to start.
 * @param size - How many it asked for.
 * @param read - One call to the host, from an offset, for at most a page.
 * @returns What was read, in order.
 */
const inPages = async <T>(
  offset: number,
  size: number,
  read: (offset: number, limit: number) => Promise<T[]>,
): Promise<T[]> => {
  const found: T[] = [];

  while (found.length < size) {
    const limit = Math.min(HOST_PAGE, size - found.length);
    const page = await read(offset + found.length, limit);

    found.push(...page);

    if (page.length < limit) {
      break;
    }
  }

  return found;
};

export { HOST_PAGE, MOST_OFFSET, inPages };
