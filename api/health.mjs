import { getActiveSources } from './_lib/memes.mjs';

export default function handler(_req, res) {
  const active = getActiveSources();
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    status: 'ok',
    timestamp: Date.now(),
    activeSources: active,
    totalSources: active.length,
  });
}
