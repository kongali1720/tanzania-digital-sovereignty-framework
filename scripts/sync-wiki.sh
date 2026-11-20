#!/usr/bin/env bash
set -euo pipefail

SRC_REPO="/home/kongali1720/tanzania-digital-sovereignty-framework"
SRC_WIKI_DIR="${SRC_REPO}/docs/wiki"
WIKI_REPO_DIR="/home/kongali1720/tanzania-digital-sovereignty-framework.wiki"
WIKI_REMOTE_URL="https://github.com/kongali1720/tanzania-digital-sovereignty-framework.wiki.git"
REPO_BLOB_BASE="https://github.com/kongali1720/tanzania-digital-sovereignty-framework/blob/main"

if [ ! -d "$SRC_WIKI_DIR" ]; then
  echo "Error: Source wiki directory not found at $SRC_WIKI_DIR" >&2
  exit 1
fi

# 1. Clone wiki repo if not yet present, or pull latest changes
if [ ! -d "${WIKI_REPO_DIR}/.git" ]; then
  echo "Cloning GitHub Wiki repository..."
  git clone "$WIKI_REMOTE_URL" "$WIKI_REPO_DIR"
else
  echo "Updating existing GitHub Wiki clone..."
  git -C "$WIKI_REPO_DIR" fetch --all --prune
  WIKI_BRANCH="$(git -C "$WIKI_REPO_DIR" symbolic-ref --short HEAD 2>/dev/null || echo "master")"
  git -C "$WIKI_REPO_DIR" pull --ff-only origin "$WIKI_BRANCH" || true
fi

# 2. Copy all markdown files from docs/wiki to the root of the wiki repo
cp -f "${SRC_WIKI_DIR}"/*.md "${WIKI_REPO_DIR}/"

# 3. Rewrite relative repo governance links in _Sidebar.md to absolute GitHub URLs
if [ -f "${WIKI_REPO_DIR}/_Sidebar.md" ]; then
  python3 -c '
from pathlib import Path

sidebar_path = Path("'"${WIKI_REPO_DIR}/_Sidebar.md"'")
base = "'"${REPO_BLOB_BASE}"'"
content = sidebar_path.read_text(encoding="utf-8")

replacements = {
    "(../../README.md)": f"({base}/README.md)",
    "(../../GOVERNANCE.md)": f"({base}/GOVERNANCE.md)",
    "(../../SECURITY.md)": f"({base}/SECURITY.md)",
    "(../../CONTRIBUTING.md)": f"({base}/CONTRIBUTING.md)",
}
for old, new in replacements.items():
    content = content.replace(old, new)

sidebar_path.write_text(content, encoding="utf-8")
'
fi

# 4. Commit and push only if there are changes
WIKI_BRANCH="$(git -C "$WIKI_REPO_DIR" rev-parse --abbrev-ref HEAD)"
git -C "$WIKI_REPO_DIR" add -A

if ! git -C "$WIKI_REPO_DIR" diff --cached --quiet; then
  git -C "$WIKI_REPO_DIR" commit -m "docs(wiki): sync institutional pages, sidebar, and index from docs/wiki"
  git -C "$WIKI_REPO_DIR" push origin "$WIKI_BRANCH"
  echo "Wiki sync completed and pushed to origin/${WIKI_BRANCH}."
else
  echo "No wiki changes to commit or push."
fi
