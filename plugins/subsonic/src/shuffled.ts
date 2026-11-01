/**
 * Puts things in a random order.
 *
 * @param items - The things.
 * @returns A shuffled copy.
 */
const shuffled = <T>(items: readonly T[]): T[] => {
  const copy = [...items];

  for (let at = copy.length - 1; at > 0; at -= 1) {
    const other = Math.floor(Math.random() * (at + 1));
    const held = copy[at];
    const swapped = copy[other];

    if (held !== undefined && swapped !== undefined) {
      copy[at] = swapped;
      copy[other] = held;
    }
  }

  return copy;
};

export { shuffled };
