# scanservjs — Pixel-Precise Coordinates (`feature/ui-dimensions`)

> **This is a feature branch** of [Markus Gutschke's community fork](https://github.com/gutschke/scanservjs)
> of [sbs20/scanservjs](https://github.com/sbs20/scanservjs).
>
> For the full feature set and a pre-built Debian/Ubuntu package, see the
> [`production` branch](https://github.com/gutschke/scanservjs/tree/production) or the
> [`binary` branch](https://github.com/gutschke/scanservjs/tree/binary).

## Pixel-Precise Coordinates

Replaces the single millimetre input for scan geometry with dual mm/pixel fields:

- Dimension fields show both mm and px values simultaneously.
- Pixel counts reflect the configured scan resolution, not the preview scale.
- Aspect-ratio lock maintains proportions when editing either dimension.

Useful for scanning at exact pixel dimensions (e.g. 2480×3508 px for A4 at 300 dpi).
