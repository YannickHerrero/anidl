# anidl

Private learning project for exploring a TMDB + Torrentio + Real-Debrid workflow in a Next.js app.

## Current scope

- onboarding page with local browser storage for the TMDB and Real-Debrid API keys
- gated search page skeleton
- gated movie and TV detail page skeleton

Both keys are currently mandatory, and the project is intentionally focused on a Real-Debrid-only download flow.

## Local development

```bash
bun dev
```

Useful checks:

```bash
bun lint
bun typecheck
bun build
```
