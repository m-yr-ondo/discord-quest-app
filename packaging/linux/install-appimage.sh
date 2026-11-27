#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 || ! -f "$1" ]]; then
  echo "usage: install-appimage.sh <path to .AppImage>" >&2
  exit 1
fi

appimage="$1"
bin_dir="$HOME/.local/bin"
desktop_dir="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
target="$bin_dir/discord-quest-app.AppImage"

mkdir -p "$bin_dir" "$desktop_dir"
install -m 755 "$appimage" "$target"

cat > "$desktop_dir/discord-quest-app.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Discord Quest App
Exec=$target
Icon=applications-games
Terminal=false
Categories=Game;Utility;
StartupWMClass=discord-quest-completer
EOF

echo "Installed $target"
