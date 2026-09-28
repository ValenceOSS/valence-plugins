import type { Provider } from './Provider';

const PROVIDERS: readonly { id: Provider; name: string; clientIdSetting: string }[] = [
  { id: 'anilist', name: 'AniList', clientIdSetting: 'anilistClientId' },
  { id: 'mal', name: 'MyAnimeList', clientIdSetting: 'malClientId' },
];

export { PROVIDERS };
