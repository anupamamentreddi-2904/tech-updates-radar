# Tech Updates Radar

An installable web app (PWA) with daily **Claude, Power BI and Microsoft Fabric** updates: what changed, how it works, how to get it, and what it means for data teams.

**Open it:** https://anupamamentreddi-2904.github.io/tech-updates-radar/

- **Android (Chrome):** tap **Install app**, or open the menu (⋮) and choose **Add to Home screen**.
- **iPhone (Safari):** tap **Share**, then **Add to Home Screen**.

## How it updates

A scheduled job checks the official release notes and blogs every morning at 09:00 IST. It summarises new items with Claude and commits them to `data/updates.json`. GitHub Pages then serves the new version automatically.

The summaries are generated independently. This project is not affiliated with Anthropic or Microsoft. Always confirm details with each update's source link.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The whole app: layout, styles and script |
| `data/updates.json` | The update feed, written by the daily job |
| `manifest.webmanifest`, `icons/` | Install as an app |
| `sw.js` | Works offline, showing the last saved updates |
