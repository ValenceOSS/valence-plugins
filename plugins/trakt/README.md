# Trakt

Keeps what you watch in Valence and your Trakt history in step.

- **Import:** connect Trakt from **Account → Trakt** and your history is imported. Each film is
  found in the library by its TMDB or IMDb id, or by an exact title from a year no more than one
  out, and each episode by its show and its season and episode numbers. Those plays are marked
  watched, at the time you watched them on Trakt. Films and shows the library does not have are
  listed, so you can see what is missing.
- **Send what you finish:** when you finish a film or an episode in Valence, it is added to your
  Trakt history. You can turn this off.
- **Once a day:** the plays added to Trakt since the last check are read, so watching in other apps
  reaches Valence too. Plays added on Trakt with an earlier date arrive when you import again.

Long histories are imported a few pages at a time, so the page stays quick and a schedule finishes
the rest. You are told how it went when it is done.

## Setting it up

An administrator creates an API app at
[trakt.tv/oauth/applications](https://trakt.tv/oauth/applications), with the redirect address
Valence shows on the plugin's settings, and fills in the plugin's settings:

| Setting         | Where it comes from                     |
| --------------- | --------------------------------------- |
| Trakt client id | The API app's page on Trakt, once saved |

Trakt signs people in with PKCE, which needs only the client id, so there is no client secret to
add.

Trakt deletes an API app that goes unused for 30 days.

## What it asks for

| Permission      | Why                                                       |
| --------------- | --------------------------------------------------------- |
| Network: Trakt  | To read and add to your history                           |
| Accounts: Trakt | To act for you on Trakt, only once you connect it         |
| Library: read   | To find each film, show and episode                       |
| Viewing: write  | To mark plays watched, and to hear what you have finished |
| Storage: 5 MB   | To remember how far an import has got, and your username  |
| Notifications   | To tell you when an import finishes                       |
