# Valence plugins

The official plugins for [Valence](https://github.com/ValenceOSS/Valence), and the signed catalogue
every Valence server can install them from.

| Plugin                                           | What it does                                                                                                              |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| [AniList and MyAnimeList](plugins/anilist)       | Imports what you have watched, marks those episodes watched in Valence, and keeps your list up to date as you watch       |
| [Playlist import](plugins/music-import)          | Brings Spotify and Apple Music playlists into Valence, and can request the albums your library does not have yet          |
| [Trakt](plugins/trakt)                           | Imports your Trakt watch history, marks it watched in Valence, and adds what you finish in Valence to Trakt               |
| [ListenBrainz and Last.fm](plugins/listenbrainz) | Scrobbles what you play, and keeps Weekly Jams, Weekly Exploration, Daily Jams and your loved tracks as Valence playlists |

## Installing one

An administrator installs these from **Admin → Plugins** in Valence. The list there is this
repository's catalogue, at
[valenceoss.github.io/valence-plugins/catalogue.json](https://valenceoss.github.io/valence-plugins/catalogue.json).
Each plugin shows what it asks permission for before it is installed.

## How they are trusted

Every package is signed with Valence's Ed25519 key when it is released, and the catalogue is signed
as a whole. A Valence server holds the matching public key and refuses a package or a catalogue
that does not verify. The private key lives only in this repository's `VALENCE_PLUGIN_SIGNING_KEY`
secret; it is never committed.

Plugins run on the server, never in an app, inside a sandbox that can reach nothing but the
`valence` object handed to them. See the
[plugin guide](https://docs.getvalence.app/develop/plugins) for the details.

## Working on them

```sh
pnpm install
pnpm test        # the plugins' own tests, with the Valence host faked
pnpm build       # bundles each plugin and packs it into packages/
```

Each plugin is `manifest.json` plus TypeScript under `src/`, bundled by esbuild into one
`dist/plugin.js`. `shared/` holds the helpers they share, and `shared/testing/aHost.ts` a stand-in
`valence` for tests.

## Releasing

Bump a plugin's `version` in its `manifest.json` and merge to `main`. The release workflow then
tests and builds everything, signs each new version and attaches it to a release named
`<id>-v<version>`, rebuilds and signs `catalogue.json`, and publishes it to GitHub Pages. Versions
already released are left as they are, and the catalogue lists the packages that were published.

To write your own plugin, start from
[valence-plugin-template](https://github.com/ValenceOSS/valence-plugin-template).
