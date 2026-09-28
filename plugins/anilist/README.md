# AniList and MyAnimeList

Keeps what you watch in Valence and your anime list in step.

- **Import:** connect AniList, MyAnimeList or both from **Account → Anime tracking**, then import.
  Each show on your list is found in the library by its AniList or MyAnimeList id, or by an exact
  title from a year no more than one out, and the episodes your list says you have seen are marked
  watched. Shows it cannot find are listed, so you can see what is missing.
- **Keep up to date:** when you finish an episode that an import matched, your lists are told how
  far through the show you are, completing it at the last episode. You can turn this off.
- **Once a day:** your lists are read again, so progress made in other apps reaches Valence.
- **On a programme's page:** a panel shows which anime it was matched to, with links to it.

Long lists are imported a few shows at a time, so the page stays quick and a schedule finishes the
rest.

## Setting it up

An administrator creates an API client with each service, using the redirect address Valence shows
on the plugin's settings, and fills in the plugin's settings:

| Setting                          | Where it comes from                                                    |
| -------------------------------- | ---------------------------------------------------------------------- |
| AniList client id and secret     | [anilist.co/settings/developer](https://anilist.co/settings/developer) |
| MyAnimeList client id and secret | [myanimelist.net/apiconfig](https://myanimelist.net/apiconfig)         |

## What it asks for

| Permission                       | Why                                                          |
| -------------------------------- | ------------------------------------------------------------ |
| Network: AniList and MyAnimeList | To read and update your lists                                |
| Accounts: AniList, MyAnimeList   | To act for you on each, only once you connect it             |
| Library: read                    | To find each show and its episodes                           |
| Viewing: write                   | To mark episodes watched, and to read what you have finished |
| Storage: 20 MB                   | To remember matches and how far an import has got            |
| Notifications                    | To tell you when an import finishes                          |
