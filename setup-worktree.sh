#!/bin/bash
# setup-worktree.sh — install Claude Code symlinks in a worktree
#
# Creates CLAUDE.md and .claude symlinks pointing back to dev/ so that Claude
# has project context and correct permissions in every worktree without
# duplicating or committing those files to the feature branches.
#
# Also ensures dev/.claude/settings.local.json exists with sensible defaults.
#
# Usage:
#   ./dev/setup-worktree.sh <worktree-path>
#   ./dev/setup-worktree.sh .              # production root itself
#
# Must be run from the production repository root (or any path where
# git can locate the repo).

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
DEV_DIR="$REPO_ROOT/dev"

if [ ! -f "$DEV_DIR/CLAUDE.md" ]; then
  echo "Error: dev/CLAUDE.md not found. Set up the chore/dev-tools worktree first:" >&2
  echo "  git worktree add dev chore/dev-tools" >&2
  exit 1
fi

# Ensure dev/.claude/settings.local.json exists (not tracked; recreate if missing)
SETTINGS="$DEV_DIR/.claude/settings.local.json"
mkdir -p "$DEV_DIR/.claude"
if [ ! -f "$SETTINGS" ]; then
  cat > "$SETTINGS" << 'EOF'
{
  "permissions": {
    "allow": [
      "Bash(*)"
    ]
  }
}
EOF
  echo "Created: $SETTINGS"
fi

TARGET="${1:-.}"
TARGET="$(realpath "$TARGET")"

if [ ! -d "$TARGET" ]; then
  echo "Error: target directory '$TARGET' does not exist." >&2
  exit 1
fi

# Compute relative path from TARGET to DEV_DIR
REL="$(python3 -c "import os; print(os.path.relpath('$DEV_DIR', '$TARGET'))")"

CLAUDE_MD="$TARGET/CLAUDE.md"
CLAUDE_DIR="$TARGET/.claude"

# Install CLAUDE.md symlink
if [ -L "$CLAUDE_MD" ]; then
  echo "CLAUDE.md symlink already exists in $TARGET"
elif [ -f "$CLAUDE_MD" ]; then
  echo "Warning: $CLAUDE_MD is a regular file, not replacing it automatically." >&2
  echo "  To replace: rm $CLAUDE_MD && ln -s $REL/CLAUDE.md $CLAUDE_MD" >&2
else
  ln -s "$REL/CLAUDE.md" "$CLAUDE_MD"
  echo "Created: $CLAUDE_MD -> $REL/CLAUDE.md"
fi

# Install .claude symlink (replaces directory if it only contains settings.local.json)
if [ -L "$CLAUDE_DIR" ]; then
  echo ".claude symlink already exists in $TARGET"
elif [ -d "$CLAUDE_DIR" ]; then
  COUNT=$(find "$CLAUDE_DIR" -maxdepth 1 -mindepth 1 | wc -l)
  HAS_ONLY_SETTINGS=$(find "$CLAUDE_DIR" -maxdepth 1 -mindepth 1 ! -name "settings.local.json" | wc -l)
  if [ "$HAS_ONLY_SETTINGS" -eq 0 ]; then
    rm -rf "$CLAUDE_DIR"
    ln -s "$REL/.claude" "$CLAUDE_DIR"
    echo "Replaced: $CLAUDE_DIR -> $REL/.claude"
  else
    echo "Warning: $CLAUDE_DIR contains files other than settings.local.json; not replacing." >&2
    echo "  Files: $(ls "$CLAUDE_DIR")" >&2
  fi
else
  ln -s "$REL/.claude" "$CLAUDE_DIR"
  echo "Created: $CLAUDE_DIR -> $REL/.claude"
fi

# Add symlinks to the worktree's git exclude file so they don't show as untracked
WT_GIT_DIR="$(git -C "$TARGET" rev-parse --git-dir)"
EXCLUDE_FILE="$WT_GIT_DIR/info/exclude"
mkdir -p "$(dirname "$EXCLUDE_FILE")"

if ! grep -q "^CLAUDE\.md$" "$EXCLUDE_FILE" 2>/dev/null; then
  printf "\n# Claude Code symlinks (managed by dev/setup-worktree.sh)\nCLAUDE.md\n.claude\n" >> "$EXCLUDE_FILE"
  echo "Updated: $EXCLUDE_FILE"
fi

echo "Done: $TARGET"
