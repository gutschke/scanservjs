# scanservjs — Binary Packages (`binary`)

This branch contains pre-built Debian/Ubuntu `.deb` packages for the
[scanservjs enhanced fork](../../tree/production).

## Install the Latest Package

Download and install with one command:

```bash
curl -LO https://github.com/gutschke/scanservjs/raw/binary/scanservjs_3.0.4-1_all.deb
sudo apt install ./scanservjs_3.0.4-1_all.deb
```

All required dependencies (`nodejs`, `imagemagick`, `sane-utils`, `python3`) are
pulled in automatically by `apt`.

After installation, scanservjs is available at **http://localhost:8080**.

## Upgrade

```bash
# Download the new .deb, then:
sudo apt install ./scanservjs_<new-version>_all.deb
```

`apt install` on a `.deb` file handles upgrades correctly — no need to remove
the old version first.

## Uninstall

```bash
sudo apt remove scanservjs
```

To also remove configuration files:

```bash
sudo apt purge scanservjs
```

## Source Code and Documentation

See the [`production`](../../tree/production) branch for source code, features,
and build instructions.

To build a `.deb` package from source:

```bash
git checkout production
npm run build
./makedeb.sh
# Output: debian/scanservjs_<version>-1_all.deb
```
