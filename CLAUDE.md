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
| `chore/dev-tools` | Dev infrastructure: CLAUDE.md, setup scripts, devcontainer; worktree at `dev/` |
| `feature/pr-774` | Upstream pending PR #774 (external author) |
| `feature/pr-zip` | Upstream pending PR: ZIP download (external author) |
| `feature/security` | Security hardening: input validation, shell injection prevention |

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
| `features/editor/` | `feature/editor` |
| `features/about-fork/` | `feature/about-fork` |
| `features/security/` | `feature/security` |

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

`dev/.claude/settings.json` (tracked) grants `Bash(*)` permissions across all
worktrees. `settings.local.json` is intentionally untracked (blocked by global
git config) and is not required; `settings.json` takes precedence. In particular
this means you should always operate under the assumption that no matter what
else, all bash commands are `Bash(*)` and therefore allowed without having to
ask for confirmation.

## Automatic Worktree Navigation

When working on any named feature, automatically operate in the correct worktree
directory without requiring the user to specify it:

- `feature/pwa` → `features/pwa/`
- `feature/autocrop` → `features/autocrop/`
- `feature/XXX` → `features/XXX/`
- `chore/dev-tools` → `dev/`
- `binary` → `binary/`
- `production` / `master` → repo root (`.`)

All git operations on a feature branch must use `git -C features/<name>/` or
run commands with the correct working directory. Never switch branches in the
production root to work on a feature — use the worktree.

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

### Internationalization (i18n) Policy

Whenever a new i18n key is introduced in `en.json`, translations for **all
supported locales** must be added in the same commit (or a follow-up commit on
the same feature branch before merging to production). Supported locales:
`ar`, `cs`, `de`, `en-US`, `es`, `fr`, `hu`, `it`, `nl`, `pl`, `pt`, `pt-BR`,
`ru`, `sk`, `tr`, `uk`, `zh`.

- Use idiomatic translations; English loan words are acceptable when a natural
  equivalent would feel awkward (e.g. "PWA", "pipeline", "preset").
- Do **not** second-guess or modify existing upstream translations.
- `test.json` does not need human translations.
- Decimal/number formatting conventions in UI strings follow the source locale;
  do not convert number formats.

### Inter-Feature Dependencies

Some features build on other features and have explicit git-level dependencies.
When merging into production from a clean `master`, dependencies must be merged
first.

| Feature branch | Depends on |
|---------------|------------|
| All feature branches | `feature/security` (rebased onto as common base) |
| `feature/editor` | `feature/file-preview` (merged as ancestor) |

All feature branches share `feature/security` as their base (rebased from
`master`). Beyond that, branches are independent except where noted above.

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

## Default Post-Work Release Workflow

Unless explicitly told otherwise for a specific session, after completing any
feature work always perform the full release sequence without prompting:

1. **Commit** changes in the feature worktree (`features/<name>/`).
2. **Merge** the feature branch into `production` (from the repo root):
   ```bash
   git -C . merge feature/<name>
   ```
   Resolve any conflicts keeping all production features intact.
3. **Build** the UI and server from the production root:
   ```bash
   npm run build
   ```
4. **Package** the Debian binary:
   ```bash
   ./makedeb.sh
   ```
5. **Update** the `binary` branch:
   ```bash
   cp debian/scanservjs_*.deb binary/
   git -C binary add scanservjs_*.deb
   git -C binary commit -m "chore(binary): update debian package ..."
   ```
6. **Push** everything to GitHub:
   ```bash
   git push origin feature/<name>
   git push origin production
   git push origin binary
   ```

**Commit strategy:** Never assume whether to squash, how many commits to
squash, or whether to create incremental commits. Wait for explicit instruction
per chat session. Once the user states a squash/commit policy in a session,
apply it for all subsequent work in that session.

## Work Summary Courtesy

After completing any task, always provide a brief summary of what was done.
If the Debian binary was rebuilt and pushed, state:
- Local path: `binary/scanservjs_<version>.deb`
- GitHub: `origin/binary` branch (`binary/` worktree)

Only mention the binary location when it has actually changed in that session.

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
