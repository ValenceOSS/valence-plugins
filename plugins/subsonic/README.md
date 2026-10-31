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

Browsing artists, albums and songs, by tags or by folders; albums in alphabetical or random order; random songs; search, including the whole-library sync some apps run; playlists; streaming at the app's chosen bit rate or format; downloading the original file; and covers and artist pictures.

Starring, ratings, scrobbles and the play queue are answered but not kept yet, so lists of starred, recent, most played and newest albums are empty. Genres, lyrics, similar songs, podcasts and internet radio are answered with nothing.
