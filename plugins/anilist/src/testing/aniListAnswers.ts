/**
 * AniList answering as a viewer with one show on their list, for tests.
 *
 * @param entries - The entries on the list, as AniList sends them.
 * @returns A web that answers AniList's two questions.
 */
const aniListAnswers =
  (entries: object[]) =>
  (url: string, init: { body?: string }): { status: number; text: string } => {
    if (url !== 'https://graphql.anilist.co') {
      return { status: 404, text: '' };
    }

    if (init.body?.includes('Viewer') === true) {
      return { status: 200, text: JSON.stringify({ data: { Viewer: { id: 7 } } }) };
    }

    if (init.body?.includes('SaveMediaListEntry') === true) {
      return { status: 200, text: JSON.stringify({ data: { SaveMediaListEntry: { id: 1 } } }) };
    }

    return {
      status: 200,
      text: JSON.stringify({ data: { MediaListCollection: { lists: [{ entries }] } } }),
    };
  };

export { aniListAnswers };
