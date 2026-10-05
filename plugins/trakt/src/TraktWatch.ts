type TraktTitle = {
  traktId: string;
  title: string;
  year: number | null;
  tmdb: string | null;
  imdb: string | null;
};

/** One play from somebody's Trakt history: a film, or an episode of a show by its numbers. */
type TraktWatch =
  | ({ kind: 'film'; watchedAt: string } & TraktTitle)
  | { kind: 'episode'; watchedAt: string; show: TraktTitle; season: number; number: number };

export type { TraktTitle, TraktWatch };
