# Playlist import

Brings your playlists from Spotify and Apple Music into Valence.

- **From Spotify:** connect your account from **Account → Import playlists** and pick a playlist, or
  paste any public playlist link.
- **From Apple Music:** paste a public playlist link.
- Each song your library has goes into a new Valence playlist of the same name, in order.
- **Songs you do not have:** with the toggle on, the album of each missing song is requested, once
  per album, through Valence's requests, so it follows your server's approval rules.

Long playlists are imported a few songs at a time, and a schedule finishes what is left even if
you close the page. You are told how it went when it is done.

## Setting it up

| Setting                      | Where it comes from                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Spotify client id and secret | An app at [developer.spotify.com](https://developer.spotify.com/dashboard), with the redirect address Valence shows |
| Apple Music developer token  | A MusicKit developer token from your Apple Developer account                                                        |

Without the Spotify settings, Spotify cannot be connected and Spotify links cannot be read. Without
the Apple Music token, Apple Music links cannot be read.

## What it asks for

| Permission                       | Why                                                   |
| -------------------------------- | ----------------------------------------------------- |
| Network: Spotify and Apple Music | To read playlists                                     |
| Accounts: Spotify                | To read your own playlists, only once you connect it  |
| Library: read                    | To find each song                                     |
| Playlists: write                 | To make the playlist and add the songs                |
| Requests: create                 | To ask for albums you do not have, when you choose to |
| Storage: 10 MB                   | To remember how far an import has got                 |
| Notifications                    | To tell you when an import finishes                   |
