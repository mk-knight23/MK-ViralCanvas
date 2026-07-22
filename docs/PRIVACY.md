# Privacy

This document describes what this project does and does not do with user data. It reflects the code that actually ships.

## No account, no server-side profile

There is no signup, login, or account system. This project cannot associate a session with an identifiable user unless the user explicitly opts into a public share (where implemented).

## What lives only in your browser

The following stays in `localStorage` and never leaves your device:

- Preferences (theme, settings)
- Favorites / recent items / history
- Any project or session data authored inside the app

Users can inspect the exact contents in browser DevTools -> Application -> Local Storage. Wipe with "Clear site data" or the in-app "Delete my data" control (where implemented).

## What might reach a third party

- **TheMealDB** (MealScout only): recipe lookups. TheMealDB sees your IP and the query. See <https://www.themealdb.com/api.php>.
- **Imgflip** (ViralCanvas only): the free `get_memes` list. Imgflip sees your IP.
- **Paid image-search providers** (ViralCanvas only): the search endpoint proxies to Serper / Brave / SerpApi / Tavily / SearchApi / Exa / ScrapingDog / Apify when configured. Each provider sees the query and the request IP.
- **Analytics** (all): only when explicitly configured. See [ANALYTICS.md](ANALYTICS.md).
- **Vercel** hosts the site. Vercel receives standard HTTP metadata (IP, user agent) on every request.

## What is never sent

- Content typed inside the editor / test / pantry surface.
- Uploaded images (they are processed client-side unless the user explicitly opts into a public share).
- Any freeform text field content.

## Cookies

The core app sets no cookies. Third parties can set cookies (analytics providers if enabled, Vercel for its own analytics if the dashboard toggle is on). Everything else is `localStorage`.

## Public sharing

Public sharing surfaces (roadmap) will require an explicit click, will show a privacy warning before publish, and will strip file metadata.

## Contact

Report privacy concerns via the repo issue tracker or to the maintainer listed in [SECURITY.md](../SECURITY.md).
