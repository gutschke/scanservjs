#!/bin/bash
# dev/setup.sh — full development environment setup for the scanservjs fork
#
# Sets up all git worktrees, installs Claude Code symlinks, and optionally
# installs npm dependencies. Safe to run multiple times (idempotent).
#
# Normally called via the production root's setup.sh bootstrap, but can also
# be called directly if the dev/ worktree already exists.
#
# Usage:
#   ./dev/setup.sh              # full setup, including npm install
#   ./dev/setup.sh --no-install # skip npm install

set -euo pipefail

DEV_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# For a worktree, --show-toplevel returns the worktree root, not the main repo.
# --git-common-dir returns the shared .git directory; its parent is the main root.
GIT_COMMON_DIR="$(git -C "$DEV_DIR" rev-parse --git-common-dir)"
REPO_ROOT="$(cd "$DEV_DIR/$GIT_COMMON_DIR/.." 2>/dev/null && pwd || dirname "$GIT_COMMON_DIR")"

echo "=== scanservjs fork — development environment setup ==="
echo "Repository root: $REPO_ROOT"
echo ""

# ── 1. Upstream remote ──────────────────────────────────────────────────────
if ! git -C "$REPO_ROOT" remote get-url upstream >/dev/null 2>&1; then
  git -C "$REPO_ROOT" remote add upstream https://github.com/sbs20/scanservjs.git
  echo "[remote] Added: upstream → https://github.com/sbs20/scanservjs.git"
else
  echo "[remote] upstream already configured."
fi

# ── 2. Fetch all remotes ────────────────────────────────────────────────────
echo "[fetch] Fetching all remotes..."
git -C "$REPO_ROOT" fetch --all --quiet
echo "[fetch] Done."

# ── 3. Switch main worktree to production ───────────────────────────────────
CURRENT="$(git -C "$REPO_ROOT" symbolic-ref --short HEAD 2>/dev/null || echo '(detached)')"
if [ "$CURRENT" != "production" ]; then
  echo "[branch] Switching main worktree to 'production'..."
  git -C "$REPO_ROOT" checkout production
else
  echo "[branch] Already on 'production'."
fi

# ── 4. .git/info/exclude entries ────────────────────────────────────────────
EXCLUDE_FILE="$REPO_ROOT/.git/info/exclude"
ensure_excluded() {
  local pattern="$1"
  if ! grep -qF "$pattern" "$EXCLUDE_FILE" 2>/dev/null; then
    echo "$pattern" >> "$EXCLUDE_FILE"
    echo "[exclude] Added: $pattern"
  fi
}
echo "[exclude] Checking .git/info/exclude..."
ensure_excluded "features/"
ensure_excluded "dev/"
ensure_excluded "binary/"
ensure_excluded "scanserv-support.tar"

# ── 5. Worktrees ─────────────────────────────────────────────────────────────
create_worktree() {
  local rel_path="$1"
  local branch="$2"
  local abs_path="$REPO_ROOT/$rel_path"
  # Normalize the path for matching (no trailing slash)
  abs_path="${abs_path%/}"
  if git -C "$REPO_ROOT" worktree list --porcelain 2>/dev/null | grep -qF "worktree $abs_path"; then
    echo "[worktree] Exists:  $rel_path → $branch"
  else
    git -C "$REPO_ROOT" worktree add "$abs_path" "$branch" 2>&1 | sed 's/^/  /'
    echo "[worktree] Created: $rel_path → $branch"
  fi
}

echo ""
echo "[worktrees] Creating worktrees..."
create_worktree "binary"                        "binary"
create_worktree "features/autocrop"             "feature/autocrop"
create_worktree "features/debian-packaging"     "feature/debian-packaging"
create_worktree "features/file-preview"         "feature/file-preview"
create_worktree "features/paper-size-tolerance" "feature/paper-size-tolerance"
create_worktree "features/pwa"                  "feature/pwa"
create_worktree "features/scan-on-tab-click"    "feature/scan-on-tab-click"
create_worktree "features/ui-dimensions"        "feature/ui-dimensions"
create_worktree "features/ui-fixes"             "feature/ui-fixes"
create_worktree "features/editor"              "feature/editor"
create_worktree "features/about-fork"          "feature/about-fork"
create_worktree "features/security"            "feature/security"

# ── 6. Claude Code symlinks ──────────────────────────────────────────────────
echo ""
echo "[claude] Installing Claude Code symlinks..."
for wt in "$REPO_ROOT" "$REPO_ROOT/binary" "$REPO_ROOT"/features/*/; do
  "$DEV_DIR/setup-worktree.sh" "$wt"
done

# ── 7. npm dependencies ──────────────────────────────────────────────────────
if [ "${1:-}" != "--no-install" ]; then
  echo ""
  echo "[npm] Installing dependencies (pass --no-install to skip)..."
  npm install --prefix "$REPO_ROOT" --silent
  echo "[npm] Done."
fi

# ── 8. Python venvs ──────────────────────────────────────────────────────────
# Each worktree that runs Python scripts needs its own .venv.
# This mirrors the postinst logic in makedeb.sh so dev and production behave
# identically.
setup_venv() {
  local dir="$1"
  shift
  local reqs=("$@")

  # Only create if the requirements files exist (feature may not be present)
  local any=0
  for req in "${reqs[@]}"; do
    [ -f "$req" ] && any=1 && break
  done
  [ "$any" -eq 0 ] && return

  if [ ! -d "$dir/.venv" ]; then
    echo "[venv] Creating .venv in $dir..."
    python3 -m venv "$dir/.venv"
    "$dir/.venv/bin/pip" install --quiet --upgrade pip
  else
    echo "[venv] .venv already exists in $dir"
  fi

  for req in "${reqs[@]}"; do
    if [ -f "$req" ]; then
      echo "[venv] Installing $req..."
      "$dir/.venv/bin/pip" install --quiet -r "$req"
    fi
  done
}

echo ""
echo "[venv] Setting up Python environments..."
# Production root: install all feature requirements into one shared venv
setup_venv "$REPO_ROOT" \
  "$REPO_ROOT/autocrop/requirements.txt" \
  "$REPO_ROOT/editor/requirements.txt"
# Individual feature worktrees: install their own requirements
setup_venv "$REPO_ROOT/features/autocrop" \
  "$REPO_ROOT/features/autocrop/autocrop/requirements.txt"
setup_venv "$REPO_ROOT/features/editor" \
  "$REPO_ROOT/features/editor/editor/requirements.txt"
echo "[venv] Done."

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  Setup complete!                                         ║"
echo "║                                                          ║"
echo "║  Working directory:  production branch (repo root)       ║"
echo "║  Feature worktrees:  features/*                          ║"
echo "║  Dev tooling:        dev/  (chore/dev-tools branch)      ║"
echo "║  Binary packages:    binary/  (binary branch)            ║"
echo "║                                                          ║"
echo "║  Next: npm run dev   to start the development server     ║"
echo "║        cat CLAUDE.md  for the full development guide     ║"
echo "╚══════════════════════════════════════════════════════════╝"
