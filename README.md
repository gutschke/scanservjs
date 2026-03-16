# scanservjs — Debian Packaging (`feature/debian-packaging`)

> **This is a feature branch** of [Markus Gutschke's community fork](https://github.com/gutschke/scanservjs)
> of [sbs20/scanservjs](https://github.com/sbs20/scanservjs).
>
> For the full feature set and a pre-built Debian/Ubuntu package, see the
> [`production` branch](https://github.com/gutschke/scanservjs/tree/production) or the
> [`binary` branch](https://github.com/gutschke/scanservjs/tree/binary).

## Debian Packaging

Fixes the Debian package installation script to preserve a custom `default.jpg`
placeholder image if one is already present on the target system.

Administrators commonly replace `default.jpg` with a site-specific or device-specific
placeholder. The original packaging script overwrote this file unconditionally; this
branch adds a guard so existing customisations survive package upgrades.
