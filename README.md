# scanservjs — Developer Tooling (`chore/dev-tools`)

This branch holds local development infrastructure for the
[scanservjs enhanced fork](../../tree/production).
It is **never merged into `production`** and never submitted upstream.

## Contents

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Development guide loaded by Claude Code in every worktree |
| `setup.sh` | Full setup script: worktrees, Claude symlinks, npm install |
| `setup-worktree.sh` | Installs Claude Code symlinks into a single worktree |
| `.claude/settings.local.json` | Claude Code permissions (untracked; not committed anywhere) |

## Getting Started (Fresh Clone)

```bash
git clone https://github.com/gutschke/scanservjs.git
cd scanservjs
git checkout production
./setup.sh
```

The `setup.sh` in the production root bootstraps this `dev/` worktree if it
does not yet exist, then delegates here to `dev/setup.sh` for the full setup.

## What `setup.sh` Does

1. Adds the `upstream` remote → `https://github.com/sbs20/scanservjs.git`
2. Fetches all remotes
3. Switches the main worktree to `production`
4. Updates `.git/info/exclude` so local directories stay invisible to git
5. Creates all worktrees: `binary/`, `features/autocrop/`, `features/pwa/`, etc.
6. Runs `setup-worktree.sh` on every worktree to install Claude Code symlinks
7. Runs `npm install` in the production root (pass `--no-install` to skip)

All steps are idempotent — safe to run more than once.

## Adding a New Feature Branch

```bash
# Create branch and worktree
git checkout -b feature/<name> master
git worktree add features/<name> feature/<name>

# Install Claude Code symlinks
./dev/setup-worktree.sh features/<name>

# Register it so fresh clones get it too:
# Edit dev/setup.sh, add a create_worktree line, commit to chore/dev-tools.
```

## Claude Code Symlink Architecture

`CLAUDE.md` and `.claude/` are canonical here in `dev/`. Every other worktree
accesses them via local relative symlinks — one source of truth, no drift.

```
dev/CLAUDE.md                         ← tracked in this branch
dev/.claude/settings.local.json       ← untracked (global gitignore)

Production root:  CLAUDE.md → dev/CLAUDE.md    .claude → dev/.claude
features/XXX/:    CLAUDE.md → ../../dev/…      .claude → ../../dev/.claude
binary/:          CLAUDE.md → ../dev/…         .claude → ../dev/.claude
```

Symlinks are excluded from git in each worktree's `.git/worktrees/X/info/exclude`.

## Updating CLAUDE.md

Edit `dev/CLAUDE.md` directly. The change is immediately visible in all
worktrees through their symlinks.

```bash
git -C dev add CLAUDE.md setup.sh   # or whichever files changed
git -C dev commit -m "docs: ..."
git push origin chore/dev-tools
```

## Branch and Worktree Map

See `CLAUDE.md` for the authoritative map of all branches and worktrees.
