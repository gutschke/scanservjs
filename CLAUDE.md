# CLAUDE.md — Development Guide

This repository is an enhanced fork of [sbs20/scanservjs](https://github.com/sbs20/scanservjs).

## Remotes

- `origin` — this fork: `https://github.com/gutschke/scanservjs.git`
- `upstream` — original project: `https://github.com/sbs20/scanservjs.git`

The `master` branch tracks upstream. Sync it with:
```bash
git fetch upstream && git merge upstream/master
```

## Branch Structure

| Branch | Purpose |
|--------|---------|
| `master` | Mirrors upstream; base for all feature branches |
| `production` | All features merged; what users install from this fork |
| `binary` | Pre-built Debian/Ubuntu package; worktree at `binary/` |
| `feature/XXX` | One branch per feature; independently submittable as a PR |
| `chore/devcontainer` | VSCode devcontainer configuration |
| `chore/dev-tools` | Dev infrastructure: CLAUDE.md, setup scripts; worktree at `dev/` |
| `feature/pr-774` | Upstream pending PR #774 (external author) |
| `feature/pr-zip` | Upstream pending PR: ZIP download (external author) |

## Worktree Map

| Directory | Branch |
|-----------|--------|
| `.` (repo root) | `production` — main working directory |
| `dev/` | `chore/dev-tools` |
| `binary/` | `binary` |
| `features/autocrop/` | `feature/autocrop` |
| `features/debian-packaging/` | `feature/debian-packaging` |
| `features/file-preview/` | `feature/file-preview` |
| `features/paper-size-tolerance/` | `feature/paper-size-tolerance` |
| `features/pwa/` | `feature/pwa` |
| `features/scan-on-tab-click/` | `feature/scan-on-tab-click` |
| `features/ui-dimensions/` | `feature/ui-dimensions` |
| `features/ui-fixes/` | `feature/ui-fixes` |

`features/`, `dev/`, and `binary/` are excluded from git tracking via
`.git/info/exclude`.

## Fresh Clone Setup

```bash
git clone https://github.com/gutschke/scanservjs.git
cd scanservjs
git checkout production
./setup.sh                  # creates all worktrees, installs tooling
./setup.sh --no-install     # same but skips npm install
```

`setup.sh` in the production root bootstraps `dev/` if needed, then delegates
to `dev/setup.sh` which does the full idempotent setup. Safe to re-run.

## Claude Code Configuration

`CLAUDE.md` (this file) and `.claude/` live canonically in `dev/`
(`chore/dev-tools` branch). Every other worktree accesses them via relative
symlinks so there is one source of truth.

| Location | `CLAUDE.md` | `.claude/` |
|----------|------------|-----------|
| production root | `dev/CLAUDE.md` | `dev/.claude` |
| `features/XXX/` | `../../dev/CLAUDE.md` | `../../dev/.claude` |
| `binary/` | `../dev/CLAUDE.md` | `../dev/.claude` |

Symlinks are local-only (excluded via per-worktree `info/exclude`). To install
symlinks in a new worktree: `./dev/setup-worktree.sh <path>`.

`.claude/settings.local.json` is intentionally untracked everywhere (the global
git config at `~/.config/git/ignore` blocks it). `dev/setup.sh` recreates it
with `"Bash(*)"` permissions if missing.

## README Policy

Each branch has a README appropriate to its audience:

| Branch | README audience | Scope |
|--------|----------------|-------|
| `production` | Fork users + contributors | Fork features, install, setup |
| `master` | General public / upstream mirror | Upstream content + fork notice |
| `binary` | Users installing the .deb | Install instructions only |
| `chore/dev-tools` | Developers of this fork | Tooling docs, worktree setup |

README changes that describe this fork (download links, feature descriptions,
contributor setup) belong on `production` and `master`. They are **not**
included in upstream PRs — upstream PRs come from individual feature branches.

## Feature Branch Rules

- **One feature per branch.** No cross-contamination unless there is a genuine
  dependency between features.
- Each feature must be independently reviewable and submittable as a PR.
- Write commit messages and code as if they will be reviewed by the upstream
  author. No conversational, session-specific, or meta-commentary.
- The `production` branch merges all features but is NOT submitted upstream.

## Merging Features into Production

```bash
git checkout production
git merge feature/<name>
# Resolve conflicts: keep ALL production features, add the new feature's changes.
git push origin production
```

Then rebuild the Debian package and update `binary`.

## Building and Releasing

```bash
# From production root
npm run build
./makedeb.sh

# Update binary branch via its worktree — no branch switch needed
cp debian/scanservjs_*.deb binary/
git -C binary add scanservjs_*.deb
git -C binary commit -m "chore(binary): update debian package with <description>"
git push origin binary
```

## Adding a New Feature

1. Branch from `master`: `git checkout -b feature/<name> master`
2. Create a worktree: `git worktree add features/<name> feature/<name>`
3. Install Claude symlinks: `./dev/setup-worktree.sh features/<name>`
4. Add a `create_worktree` line to `dev/setup.sh` and commit to `chore/dev-tools`
5. Develop in `features/<name>/`
6. Merge into `production` (see above)
7. Rebuild and push binary
8. Submit as a PR to `sbs20/scanservjs` against their `master`

## Deployment

Installed locally from the `binary` branch on:
- A powerful AMD server
- A low-powered ARM device (1 GB RAM)

Code must run equally well on both. Avoid memory-intensive operations,
large in-memory buffers, and unnecessary background tasks.
