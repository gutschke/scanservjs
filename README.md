# scanservjs — Scan on Tab Click (`feature/scan-on-tab-click`)

> **This is a feature branch** of [Markus Gutschke's community fork](https://github.com/gutschke/scanservjs)
> of [sbs20/scanservjs](https://github.com/sbs20/scanservjs).
>
> For the full feature set and a pre-built Debian/Ubuntu package, see the
> [`production` branch](https://github.com/gutschke/scanservjs/tree/production) or the
> [`binary` branch](https://github.com/gutschke/scanservjs/tree/binary).

## Scan on Tab Click

Optional behaviour where clicking the Scan navigation tab while already on the Scan
page triggers a new scan immediately, without pressing the Scan button separately.

Configurable via a three-state admin policy (`Never` / `User` / `Always`):

- `Never` (default): standard behaviour, no change.
- `User`: the user sees a toggle in Settings to enable or disable the feature.
- `Always`: always active regardless of user preference.

The admin policy is exposed via `scanOnTabClick` in the server configuration and
surfaced to the client through `/api/v1/context`.
