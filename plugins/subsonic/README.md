# Subsonic music apps

Lets music apps that speak [Subsonic](http://www.subsonic.org/pages/api.jsp) or [OpenSubsonic](https://opensubsonic.netlify.app), such as Symfonium, Feishin, Amperfy, play:Sub and Substreamer, play the music on a Valence server.

## Signing an app in

1. In Valence, open **Account → Security → App passwords**, and make one for **Subsonic music apps**.
2. In the app, add a Subsonic server with:
   - **Server address:** the address shown beside the app password, ending `/routes`.
   - **Username** and **password:** the ones shown when you made it.

The password is shown only once, and you can remove it at any time to sign the app out. It is never your Valence password, and the app reads only what your profile may see.

Apps that support OpenSubsonic's API keys can use the password alone as the key.

## What works

- **Browsing and search:** artists, albums and songs, by tags or by folders, including the
  whole-library sync some apps run.
- **Album lists:** newest, recently played, most played, highest rated, by name, artist, year or
  genre, and at random.
- **Playing:** streaming at the app's chosen bit rate or format, downloading the original file,
  and covers and artist pictures.
- **Stars and ratings:** a starred song is a liked song in Valence, and a starred artist one you
  follow. Ratings are your stars on a song.
- **Plays:** what the app scrobbles counts as played in Valence, at the time it was heard, so your
  mixes and statistics include it. While a song plays, the app shows as one of your devices.
- **Playlists:** your playlists, which the app can make, rename, change and remove.
- **The play queue**, kept on the server so another app can carry on where you stopped.
- **Genres, lyrics** (timed where Valence has them), **songs like** a song, album or artist,
  an artist's most played songs, and a few words about an artist.

Valence keeps no liked albums or album ratings yet, so starring or rating an album is accepted but
not kept. Podcasts, internet radio, shares and bookmarks are answered with nothing.
