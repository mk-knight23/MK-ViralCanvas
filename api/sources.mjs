import { getActiveSources } from './_lib/memes.mjs';

export default function handler(_req, res) {
  res.setHeader('Cache-Control', 'public, s-maxage=300');
  return res.status(200).json({ success: true, data: getActiveSources() });
}
