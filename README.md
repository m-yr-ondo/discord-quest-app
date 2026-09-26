<p>
  <h1 align="center">
    <a href="https://github.com/m-yr-ondo/discord-quest-app">
      Discord Quest App
    </a>
  </h1>
</p>

[![Build release](https://img.shields.io/github/actions/workflow/status/m-yr-ondo/discord-quest-app/build-release.yaml?branch=main&style=flat&label=build%20(release))](https://github.com/m-yr-ondo/discord-quest-app/actions/workflows/build-release.yaml)
[![Scheduled Rust checks](https://img.shields.io/github/actions/workflow/status/m-yr-ondo/discord-quest-app/rust-check.yml?branch=main&style=flat&label=scheduled%20build)](https://github.com/m-yr-ondo/discord-quest-app/actions/workflows/rust-check.yml?query=branch%3Amain+event%3Aschedule)


> A quest helper for Discord. Discord Quest App.

A Windows desktop application for Discord Rich Presence and completing Discord Quest for games without needing to install the full actual games/applications. Perfect for completing Discord Quests and showing off your gaming status without the storage burden.


![Discord Quest App](<docs/Screenshot 2026-08-06 190414.png>)

---

## Installation

### Windows

You can download manually pre-built release binaries on the [Releases](https://github.com/markterence/discord-activity/releases) page.

Alternatively, you can follow the [development setup instructions](#-development-setup) to build the app from source.

> [!IMPORTANT]
> Make sure you place or extract in a location where you have write or execute permissions.
> 
> The reason for this is that the app will create dummy game file in the same directory.
> By default, the app will not need to be run as administrator, unless if it was installed in a directory that requires elevated permissions. (e.g. `C:\Program Files\`, root of `C:\`, etc.)


> [!NOTE]
> Webview2 is required to run the app. WebView2 comes preinstalled on Windows 11. On versions older than Windows 11 you may need to install it manually.
> If you don't have it installed, you can download it from [here](https://developer.microsoft.com/en-us/microsoft-edge/webview2).


## ✨ Features

- Simulate playing verified Discord games without intalling a full game!
- Complete Discord Quests requiring 15-minute gameplay (not yet tested for Stream the game Quests)
- Only Discord Verified games are supported. The application fetches a list of games that Discord can automatically detect.

## How It Works

This app creates small executable files that mimic the actual game processes that Discord looks for when detecting a verified game to use it for it's Rich Presence activity.
When launched/played, the tiny executables trigger Discord's Rich Presence/Registed Games detection. Discord checks if Game exe name is running, sometimes it needs to be a folder where the game is supposed to be, thats how mainly it detects the Games, we can clearly see this on the "Registered Games" in the settings.

The dummy game executale files used by this program are placed in a folder called  `games/` folder relative to the main application's exe. As of release build v2025.10.07 the dummy executable file size is around 250kb, it could be smaller but it requires the end-users to install .NET Framework Runtime (which is sometimes comes pre-installed on an up-to-date Windows 11 PC's, so for now the dummy exe using WinAPI through C++ for compatibility rather than C#


## 🖥️ Supported Platforms

- Windows 11 


## Tech Stack

- Rust
- Vue.js
- Tauri


### Development

Install dependencies for the Vue.js frontend using pnpm

```bash
pnpm install
```

Make sure to build and copy the dummy game binary from `src-win` and is add it on tauri application's "resources" folder.

```bash
pnpm build:runner:win && pnpm copy:runner:win
```

Then run the Tauri dev command to start the development server.

```bash
pnpm tauri dev
```

- Also, get the list of detecatable games from the Discord API: `GET /api/applications/detectable` or `GET /api/:version/applications/detectable` and place the JSON file in `src/assets/gamelist.json`









### Disclaimer

This tool is intended for educational purposes and personal use. Please respect Discord's terms of service, partners, game publishers and advertisers rights when using this application.

The creators and maintainers of this project are not liable for any damages, account suspensions, or other consequences that may arise from using this software. Use at your own risk.

Discord is a registered trademark of Discord Inc. It is referenced on this open-source project for descriptive and definition purposes only and does not imply any affiliation, sponsorship, or endorsement by Discord Inc in any way.

---


## License

[MIT License](LICENSE)© 

---



