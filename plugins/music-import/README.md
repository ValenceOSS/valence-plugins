# Playlist import

Brings your playlists from Spotify and Apple Music into Valence.

- **From Spotify:** connect your account from **Account → Import playlists** and pick a playlist, or
  paste its link. Spotify shares the songs only of playlists you made or collaborate on.
- **From Apple Music:** paste a public playlist link.
- Every song goes into a new Valence playlist of the same name, in order. A song your library does
  not have is shown there as missing, with a way to request its album, and becomes the real song
  once your library has it.
- **Songs you do not have:** with the toggle on, once the playlist is in, the albums Valence matches
  exactly to its missing songs are requested through Valence's requests, so they follow your
  server's approval rules. You are told how many.

Long playlists are imported a few songs at a time, and a schedule finishes what is left even if
you close the page. You are told how it went when it is done. One import runs at a time, and you can
stop it from the page; removing its Valence playlist stops it too. Up to about 2,000 songs of a
playlist are read, and you are told if it had more. Podcast episodes are left out.

## Setting it up

| Setting                      | Where it comes from                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Spotify client id and secret | An app at [developer.spotify.com](https://developer.spotify.com/dashboard), with the redirect address Valence shows |
| Apple Music developer token  | A MusicKit developer token from your Apple Developer account                                                        |

Without the Spotify settings, Spotify cannot be connected, and Spotify links are read only through
a connected account. Spotify's own rules for apps in Development Mode apply: the app's owner needs
Spotify Premium, and only the people added to the app on Spotify's dashboard can connect it. Without the Apple Music token, Apple Music links cannot be read.

## What it asks for

| Permission                       | Why                                                                               |
| -------------------------------- | --------------------------------------------------------------------------------- |
| Network: Spotify and Apple Music | To read playlists                                                                 |
| Accounts: Spotify                | To read your own playlists, only once you connect it                              |
| Library: read                    | To find each song                                                                 |
| Playlists: write                 | To make the playlist and add the songs                                            |
| Requests: create                 | To ask for albums you do not have, when you choose to                             |
| Storage: 10 MB                   | To remember how far an import has got, and to forget it when a profile is removed |
| Notifications                    | To tell you when an import finishes                                               |
