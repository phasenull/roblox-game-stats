# Roblox Game Stats

A Chrome extension for Roblox game pages. Click its toolbar button on a game page and a popup shows the game's analytics from three sites at once: [CreatorExchange](https://creatorexchange.io), [RoTerminal](https://roterminal.co) and [RoTrends](https://www.rotrends.com). No more opening three tabs to size up a game.

<img src="screenshot.png" alt="Stats panel on a Roblox game page" width="380">

## What it shows

| Section | Source | Data |
| --- | --- | --- |
| CreatorExchange | creatorexchange.io | Players now, total visits, like ratio, revenue estimate |
| RoTerminal | roterminal.co | Monthly Robux estimate with Top Earning rank, daily hours played, 14-day bar charts |
| RoTrends | rotrends.com | Chart placements, global rank, platform share, chart cards (All / Active) |
| Playtime | roterminal.co | Minutes per visit (rolling 24h), 1D / 1W / All, hover for any point |
| CCU | roterminal.co | Concurrent players, 1D / 1W / All, hover for any point |

## Install

1. Download this repository (**Code → Download ZIP**) and unzip it, or `git clone` it.
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select the extension folder (the one containing `manifest.json`).
5. Pin the extension from the puzzle-piece menu, open any Roblox game page, for example `https://www.roblox.com/games/...`, and click the extension's toolbar button.

To update after pulling new code, click the reload icon on the extension's card in `chrome://extensions`.

## Notes

- **Monthly Robux** is only shown by RoTerminal to signed-in users. Sign in to roterminal.co in the same Chrome profile to see it; otherwise the tile asks you to sign in.
- RoTerminal sometimes runs a browser check. The extension never opens RoTerminal itself; if the check blocks it, the popup links to the game on roterminal.co. Open it once, then reopen the popup.
- Free RoTerminal accounts get a few earnings looks a day, and each popup open spends one, like opening the game on the site does.
- RoTrends data is read from its server-rendered HTML, so a redesign of that site can break the RoTrends section.
- Revenue and Robux figures are each site's own estimates, not real earnings, and the sites often disagree.
- Data is fetched fresh every time you open the popup; nothing is cached or sent anywhere else.
- Dates follow your browser's language.

## How it works

- The extension never runs code on or reads Roblox pages. `popup.js` reads only the active tab's URL (granted by `activeTab` when you click the button) and takes the place ID from it.
- `background.js` is the service worker that turns the place ID into the universe ID and game name through Roblox's public APIs, then fetches from the three sites.
- `popup.html` / `popup.css` render the panel as the extension's own popup page.

## Disclaimer

This is an unofficial tool. It is not affiliated with Roblox, CreatorExchange, RoTerminal or RoTrends. It relies on their public pages and endpoints, which can change at any time.
