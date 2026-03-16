# scanservjs — Precise Paper Sizes (`feature/paper-size-tolerance`)

> **This is a feature branch** of [Markus Gutschke's community fork](https://github.com/gutschke/scanservjs)
> of [sbs20/scanservjs](https://github.com/sbs20/scanservjs).
>
> For the full feature set and a pre-built Debian/Ubuntu package, see the
> [`production` branch](https://github.com/gutschke/scanservjs/tree/production) or the
> [`binary` branch](https://github.com/gutschke/scanservjs/tree/binary).

## Precise Paper Sizes

Replaces the rounded millimetre dimensions for US paper sizes (Letter, Legal, Tabloid,
Ledger, Junior Legal, Half Letter) with their exact metric equivalents derived from
the inch-based definitions.

This reduces rounding discrepancies when comparing scanned page dimensions against
expected paper sizes — particularly noticeable in paper-size detection pipelines and
in the PDF editor's paper-size selector.
