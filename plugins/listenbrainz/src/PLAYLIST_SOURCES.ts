import type { Service } from './Service';

/** A playlist a service makes for somebody that can be kept as a Valence playlist. */
type PlaylistSource = {
  id: string;
  service: Service;
  field: string;
  name: string;
  namedFor: (person: string) => string;
  help: string;
};

const PLAYLIST_SOURCES: readonly PlaylistSource[] = [
  {
    id: 'weekly-jams',
    service: 'listenbrainz',
    field: 'keepWeeklyJams',
    name: 'Weekly Jams',
    namedFor: (person) => `${person}’s Weekly Jams`,
    help: 'Songs you already like, from ListenBrainz every Monday.',
  },
  {
    id: 'weekly-exploration',
    service: 'listenbrainz',
    field: 'keepWeeklyExploration',
    name: 'Weekly Exploration',
    namedFor: (person) => `${person}’s Weekly Exploration`,
    help: "Songs ListenBrainz thinks you'll like, every Monday.",
  },
  {
    id: 'daily-jams',
    service: 'listenbrainz',
    field: 'keepDailyJams',
    name: 'Daily Jams',
    namedFor: (person) => `${person}’s Daily Jams`,
    help: 'From ListenBrainz every day, once you follow troi-bot there.',
  },
  {
    id: 'loved',
    service: 'lastfm',
    field: 'keepLoved',
    name: 'Loved on Last.fm',
    namedFor: (person) => `${person}’s Loved Tracks`,
    help: "The songs you've loved on Last.fm.",
  },
];

export type { PlaylistSource };

export { PLAYLIST_SOURCES };
