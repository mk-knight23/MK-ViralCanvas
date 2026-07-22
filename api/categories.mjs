import { CATEGORY_QUERIES } from './_lib/memes.mjs';

export default function handler(_req, res) {
  const categories = Object.keys(CATEGORY_QUERIES).map(key => ({
    id: key,
    name: key.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    query: CATEGORY_QUERIES[key],
  }));
  res.setHeader('Cache-Control', 'public, s-maxage=86400');
  return res.status(200).json({ success: true, data: categories });
}
