# ListenBrainz and Last.fm

Scrobbles what you play in Valence, and keeps the services' playlists for you as Valence playlists.
Everyone on the server connects their own accounts, from **Account → ListenBrainz and Last.fm**, and
everything it does is for them alone.

- **Scrobbling:** each song you finish is sent to ListenBrainz, Last.fm or both, and each song you
  start shows as playing now. Scrobbles a service does not take, while it is down, are kept and sent
  in order within the hour. You can turn scrobbling off.
- **Playlists:** choose which to keep, and each becomes a Valence playlist of its songs, kept up to
  date as the service changes it. A song your library does not have keeps its place, shown as
  missing with a way to request its album, and becomes the real song once your library has it:
  - ListenBrainz's **Weekly Jams** and **Weekly Exploration**, made every Monday, and **Daily
    Jams**, made each day for people who follow troi-bot there
  - your **loved tracks** on Last.fm, oldest first, with each song you love added at the end

  A playlist is changed in one go once all its songs are matched, and songs you add to it yourself
  stay. Turning one off stops updating it, and deleting the playlist in Valence does the same.

- **Songs you do not have:** where an administrator turns on **Request missing albums**, the
  albums of a kept playlist's missing songs are requested each time it changes. Valence finds each
  album, taking only an exact match, and requests it for the person the playlist is kept for, so
  their request permissions and your server's approval rules still apply. It is off by default.

Songs are found in the library by their title and artist, and by each artist a song credits, since
a library credits "A & B" as two artists.

## Setting it up

**ListenBrainz** needs nothing from an administrator. Each person pastes the user token from their
[ListenBrainz settings](https://listenbrainz.org/settings/).

**Last.fm** needs an API account, which an administrator creates at
[last.fm/api/account/create](https://www.last.fm/api/account/create) and adds to the plugin's
settings. Each person then connects by allowing Valence on Last.fm's site and finishing on the page.

| Setting                           | Where it comes from                                        |
| --------------------------------- | ---------------------------------------------------------- |
| Last.fm API key and shared secret | The API account's page on Last.fm                          |
| Request missing albums            | Off unless you turn it on; requests kept playlists' albums |

## What it asks for

| Permission                        | Why                                                                  |
| --------------------------------- | -------------------------------------------------------------------- |
| Network: ListenBrainz and Last.fm | To scrobble, and to read playlists and loved tracks                  |
| Library: read                     | To find each song                                                    |
| Viewing: read                     | To hear what you start and finish                                    |
| Playlists: write                  | To make the playlists and keep them up to date                       |
| Requests: create                  | To ask for albums you do not have, where an administrator chooses to |
| Storage: 10 MB                    | To keep your connections, playlists and waiting scrobbles            |
| Notifications                     | To tell you when a playlist is ready or a service disconnects        |
