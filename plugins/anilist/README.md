# AniList and MyAnimeList

Keeps what you watch in Valence and your anime list in step.

- **Import:** connect AniList, MyAnimeList or both from **Account → Anime tracking**, then import.
  The lists keep a season, or half of one, per entry, while a library keeps the whole show, so each
  entry is placed after the seasons before it, and the show is found in the library by its first
  season's AniList or MyAnimeList id, or by an exact title from a year no more than one out. The
  episodes your list says you have seen are marked watched, all of them for a show you completed.
  Shows it cannot find are listed, so you can see what is missing.
- **Keep up to date:** when you finish an episode that an import matched, the entry for its season
  is told, completing it at the last episode. Your list is read first, so progress only goes
  forward: a completed show stays completed, and starting it again from the first episode counts
  as a rewatch. You can turn this off.
- **Once a day,** once you have imported, your lists are read again, so progress made in other
  apps reaches Valence. Nobody's list is read until they import it.
- **On a programme's page:** a panel shows you which entries on your own lists it was matched to,
  with links to them.

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

| Permission                       | Why                                                                                                  |
| -------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Network: AniList and MyAnimeList | To read and update your lists                                                                        |
| Accounts: AniList, MyAnimeList   | To act for you on each, only once you connect it                                                     |
| Library: read                    | To find each show and its episodes                                                                   |
| Viewing: write                   | To mark episodes watched, and to read what you have finished                                         |
| Storage: 20 MB                   | To remember your matches and how far an import has got, and to forget them when a profile is removed |
| Notifications                    | To tell you when an import finishes                                                                  |
