# scanservjs — Installable PWA (`feature/pwa`)

> **This is a feature branch** of [Markus Gutschke's community fork](https://github.com/gutschke/scanservjs)
> of [sbs20/scanservjs](https://github.com/sbs20/scanservjs).
>
> For the full feature set and a pre-built Debian/Ubuntu package, see the
> [`production` branch](https://github.com/gutschke/scanservjs/tree/production) or the
> [`binary` branch](https://github.com/gutschke/scanservjs/tree/binary).

## Installable PWA

Turns scanservjs into a Progressive Web App:

- **Install to home screen**: Users can add scanservjs to their home screen on Android,
  iOS, and desktop Chromium-based browsers via the browser's "Add to Home Screen" or
  "Install app" prompt.
- **Configurable app name**: The PWA display name is read from the scanservjs
  `applicationName` configuration key, so each instance can show a site-specific name.
- **SVG favicon**: Adds a scalable vector favicon for crisp display at any resolution.

Adds `site.webmanifest`, a full maskable icon set (192×192 and 512×512 PNG), and the
necessary `<link>` tags to `index.html`.
