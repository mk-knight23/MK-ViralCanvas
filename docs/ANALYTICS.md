# Analytics

This project ships with **no analytics enabled by default**. Nothing is loaded unless you explicitly configure it.

## What can be enabled

| Provider | Activation | What it collects |
|---|---|---|
| Vercel Web Analytics | Enable "Web Analytics" in the Vercel project dashboard | Anonymous page views + Web Vitals |
| Vercel Speed Insights | Enable "Speed Insights" in the Vercel project dashboard | Real-user Web Vitals (LCP/CLS/FID/INP) |
| Google Tag Manager | Set `VITE_GTM_ID=GTM-XXXX` at build time | Whatever the GTM container is configured to send |
| Google Analytics 4 | Set `VITE_GA4_ID=G-XXXX` at build time | GA4 default events + any custom `gtag()` calls |

The activation checks in `index.html` explicitly reject the placeholder token `%VITE_GTM_ID%` and require valid GTM/GA4 id shapes, so unset variables never fire a network request.

## What is never sent, by design

- Content typed by the user (typing content, meme text, pantry ingredients, recipe notes).
- Uploaded images or exported files.
- Search queries pasted into the app.
- Any freeform text a user could put into a field.

## Local storage

This project uses `localStorage` for persistent state (favorites, history, settings). Nothing in `localStorage` is transmitted anywhere. Users can export or wipe their data from the settings surface (or from browser DevTools).

## AI providers

No AI providers are wired in this repo yet. Environment variables named `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, and `GOOGLE_GENERATIVE_AI_API_KEY` are placeholders. When AI is implemented, this document will list exactly what content is sent per provider, and any AI action will show that information at the point of use before hitting a network endpoint.

## Verifying

To confirm what is loaded, open DevTools Network tab on a preview build. With no env vars set and no Vercel dashboard toggles enabled, you should see zero third-party requests to Google, Meta, or any analytics vendor.
