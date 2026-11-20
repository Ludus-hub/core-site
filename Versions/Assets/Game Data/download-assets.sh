#!/usr/bin/env bash
# ============================================================
# download-assets.sh
# Downloads all game HTML files and cover images locally
# so your site works without hitting cdn.jsdelivr.net
# ============================================================

set -e

DEST="./Versions/Assets/Games"   # change this to wherever you want the files
HTML_DIR="$DEST/html"
COVERS_DIR="$DEST/covers"

echo "Creating directories..."
mkdir -p "$HTML_DIR" "$COVERS_DIR"

# --- Option A: clone the repos (fast, gets everything) ---
# Requires git. Recommended if you want to keep them updated easily.

echo "Cloning html repo..."
git clone --depth=1 https://github.com/freebuisness/html "$HTML_DIR"

echo "Cloning covers repo..."
git clone --depth=1 https://github.com/freebuisness/covers "$COVERS_DIR"

echo ""
echo "Done! Files are in: $DEST"
echo ""
echo "Now update your script.js — run the patch script:"
echo "  node patch-paths.js"
