# CLAUDE.md — Development Guide

This repository is an enhanced fork of [sbs20/scanservjs](https://github.com/sbs20/scanservjs).

## Remotes

- `origin` — this fork: `https://github.com/gutschke/scanservjs.git`
- `upstream` — original project: `https://github.com/sbs20/scanservjs.git`

The `master` branch tracks upstream. Keep it in sync with `upstream/master`
via `git fetch upstream && git merge upstream/master` to pick up new releases.

## Branch Structure

| Branch | Purpose |
|--------|---------|
| `master` | Mirrors upstream; base for all feature branches |
| `production` | Merges all feature branches; what users install |
| `binary` | Pre-built Debian/Ubuntu package ready for `apt install` |
| `feature/XXX` | One branch per feature; must be independently submittable as a PR |
| `chore/devcontainer` | VSCode devcontainer configuration |
| `chore/dev-tools` | Local development infrastructure: this file, Claude permissions |
| `feature/pr-774` | Upstream pending PR #774 (external author) |
| `feature/pr-zip` | Upstream pending PR: ZIP download support (external author) |

## Worktrees

Each branch that requires active local development has a corresponding worktree:

```
dev/                          → branch chore/dev-tools  (Claude config, dev scripts)
binary/                       → branch binary           (pre-built .deb packages)
features/autocrop             → branch feature/autocrop
features/debian-packaging     → branch feature/debian-packaging
features/file-preview         → branch feature/file-preview
features/paper-size-tolerance → branch feature/paper-size-tolerance
features/pwa                  → branch feature/pwa
features/scan-on-tab-click    → branch feature/scan-on-tab-click
features/ui-dimensions        → branch feature/ui-dimensions
features/ui-fixes             → branch feature/ui-fixes
```

The `features/`, `dev/`, and `binary/` directories are excluded from git tracking
via `.git/info/exclude`.

Create a new worktree for a new feature branch:
```bash
git worktree add features/<name> feature/<name>
# Then run: ./dev/setup-worktree.sh features/<name>
```

## Claude Code Configuration

`CLAUDE.md` (this file) and `.claude/settings.local.json` live in the `chore/dev-tools`
branch, checked out at `dev/`. Every other worktree (production root, feature branches,
binary) accesses them via symlinks so there is one canonical copy.

**Why symlinks instead of copies:**
- Single source of truth — no drift between branches
- Permissions stay consistent — no per-branch "decision fatigue" from missing allow-lists
- `CLAUDE.md` stays out of production commit history (production is a PR candidate for upstream)

**Symlink layout** (relative symlinks, all excluded from git tracking):

| Location | `CLAUDE.md` symlink | `.claude` symlink |
|----------|--------------------|--------------------|
| production root | `dev/CLAUDE.md` | `dev/.claude` |
| `features/XXX/` | `../../dev/CLAUDE.md` | `../../dev/.claude` |
| `binary/` | `../dev/CLAUDE.md` | `../dev/.claude` |

Use `./dev/setup-worktree.sh <path>` to install symlinks in any worktree.

## First-Time Setup (fresh clone)

```bash
# Create all worktrees
git worktree add dev chore/dev-tools
git worktree add binary binary
git worktree add features/autocrop feature/autocrop
git worktree add features/pwa feature/pwa
# ... etc for other feature branches

# Install Claude symlinks in every worktree
for wt in . binary/ features/*/; do
  ./dev/setup-worktree.sh "$wt"
done
```

## Feature Branch Rules

- **One feature per branch.** No cross-contamination unless unavoidable due to a genuine dependency.
- Each feature must be independently reviewable and submittable as a PR to upstream.
- Write commit messages and code comments as if they will be reviewed by the upstream author.
  No conversational, session-specific, or meta commentary (e.g., "changed from earlier attempt").
- The `production` branch merges all features but is NOT itself submitted upstream.

## Merging Features into Production

```bash
git checkout production
git merge feature/<name>
# Resolve conflicts carefully: keep ALL production features, add the new feature's changes.
git push origin production
```

After merging into `production`, rebuild and update the `binary` branch.

## Building and Releasing

```bash
# From production root
npm run build
./makedeb.sh

# Update binary branch via its worktree (no branch switch needed)
cp debian/scanservjs_*.deb binary/
git -C binary add scanservjs_*.deb
git -C binary commit -m "chore(binary): update debian package with <feature>"
git push origin binary
```

## README.md Policy

`README.md` changes that describe this fork (download links, feature list, badges) belong
on the `production`/`master` branches for GitHub users but are **not** included in upstream PRs.

## Deployment

Installed locally from the `binary` branch on:
- A powerful AMD server
- A low-powered ARM device (1 GB RAM)

Code must run equally well on both targets. Avoid memory-intensive operations,
large in-memory buffers, and unnecessary background tasks.

## Adding a New Feature

1. Branch from `master`: `git checkout -b feature/<name> master`
2. Create a worktree: `git worktree add features/<name> feature/<name>`
3. Install Claude symlinks: `./dev/setup-worktree.sh features/<name>`
4. Develop the feature in isolation.
5. Merge into `production`: `git checkout production && git merge feature/<name>`
6. Rebuild the Debian package and update the `binary` branch (see above).
7. Submit as a PR to `sbs20/scanservjs` against their `master`.
