# scanservjs — File Previews (`feature/file-preview`)

> **This is a feature branch** of [Markus Gutschke's community fork](https://github.com/gutschke/scanservjs)
> of [sbs20/scanservjs](https://github.com/sbs20/scanservjs).
>
> For the full feature set and a pre-built Debian/Ubuntu package, see the
> [`production` branch](https://github.com/gutschke/scanservjs/tree/production) or the
> [`binary` branch](https://github.com/gutschke/scanservjs/tree/binary).

## File Previews

Adds in-browser previews for files in the Files tab:

- **PDF**: Opens inline in the browser (no download required).
- **Images**: JPEG, PNG, and TIFF files previewed inline; TIFF images are transcoded
  to JPEG on-the-fly via ImageMagick for broad browser compatibility.
- **OCR text**: Plain-text output previewed as formatted text.

`feature/editor` depends on this branch (merged in as a git ancestor).
