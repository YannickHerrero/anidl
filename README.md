# anidl

anidl is a Next.js app for browsing TMDB metadata, finding cached Torrentio results through Real-Debrid, and reviewing season-wide episode matches before opening downloads.

## What it does

- search movies and TV shows with TMDB
- open movie and TV detail pages with live TMDB metadata
- load cached Torrentio sources using a saved Real-Debrid token
- score and highlight the strongest source picks
- review TV seasons in a separate bulk screen
- group episode candidates into likely release families
- let you swap or uncheck episode sources before opening downloads

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Bun for local scripts

## How it works

The app stores your TMDB and Real-Debrid API keys in browser local storage.

- TMDB is used for search, title metadata, external IDs, seasons, and episodes
- Torrentio is used for cached source discovery
- Real-Debrid is validated before source loading and is passed through Torrentio for cached results

At the moment, the app focuses on cached-source discovery and manual download/open actions. It does not manage full Real-Debrid torrent lifecycles in-app.

## Current flow

1. Save your TMDB and Real-Debrid API keys on the onboarding screen
2. Search for a movie or TV show
3. Open a detail page
4. For movies, inspect cached source picks directly
5. For TV, pick a season and optionally open the season review screen
6. In season review, choose a release family, adjust episode matches, and open downloads manually per episode

## Local development

Install dependencies:

```bash
bun install
```

Start the dev server:

```bash
bun dev
```

## Scripts

```bash
bun lint
bun typecheck
bun format
bun run build
bun start
```

Note: use `bun run build`, not `bun build`.

## Configuration

You need:

- a TMDB API key (`API Key (v3 auth)`)
- a Real-Debrid API token

Both are currently required by the app flow.

## Project structure

- `app/` routes and layout
- `components/app/` app-specific screens and flows
- `components/ui/` reusable UI primitives
- `hooks/` client hooks
- `lib/` API clients, matching logic, and browser storage helpers

## Status

This project is functional but still evolving.

Implemented:

- TMDB search
- movie and TV detail pages
- cached Torrentio source loading
- source scoring and best-pick highlighting
- season review and release-family matching

Not implemented yet:

- automated batch queueing
- full Real-Debrid torrent management
- tests

## Roadmap ideas

- improve release-family matching for difficult anime naming patterns
- add bulk helpers like open selected or copy selected links
- enrich detail pages with credits, trailers, and related titles
- add stronger source filtering and sorting controls

## Disclaimer

This project is provided as-is for educational and personal-use experimentation. Make sure your usage complies with the rules and laws that apply to your region and the services you use.

## Legal note

This project is an interface for aggregating metadata and results from third-party services. It does not host, upload, store, stream, or distribute copyrighted media. Users are responsible for ensuring their use complies with applicable law and the terms of the services they connect.
