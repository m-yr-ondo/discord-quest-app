#!/bin/sh
# WebKit spawns its helper processes from <libdir>/webkit2gtk-4.1 by path, and
# linuxdeploy does not bundle them, so an AppImage without them dies with
# "Unable to spawn a new child process: WebKitNetworkProcess". Copy the host's
# helpers next to the config; tauri.linux.conf.json maps them into the payload.
set -eu

src=${WEBKIT_HELPERS_DIR:-/usr/lib/webkit2gtk-4.1}
dst=$(cd "$(dirname "$0")/../.." && pwd)/src-tauri/webkit2gtk

mkdir -p "$dst"
for helper in WebKitNetworkProcess WebKitWebProcess WebKitGPUProcess; do
    if [ ! -x "$src/$helper" ]; then
        echo "missing $src/$helper" >&2
        exit 1
    fi
    cp "$src/$helper" "$dst/$helper"
done

echo "copied WebKit helpers from $src"
