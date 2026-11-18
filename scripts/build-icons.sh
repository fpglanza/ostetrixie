#!/bin/sh
# Regenerates the PNG app icons from the authored SVG sources (macOS `sips`).
# Sources: public/icons/icon.svg (any) and public/icons/icon-maskable.svg (mark inside the 80% safe zone).
set -e
cd "$(dirname "$0")/../public/icons"
sips -s format png icon.svg --out icon-512.png >/dev/null
sips -s format png icon.svg --out icon-192.png >/dev/null && sips -z 192 192 icon-192.png >/dev/null
sips -s format png icon.svg --out apple-touch-icon.png >/dev/null && sips -z 180 180 apple-touch-icon.png >/dev/null
sips -s format png icon-maskable.svg --out icon-maskable-512.png >/dev/null
echo "Icons regenerated in public/icons/"
