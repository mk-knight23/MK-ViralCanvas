import { getImgflipTemplates } from '../_lib/memes.mjs';
import { enforceRateLimit } from '../_lib/rateLimit.mjs';

export default async function handler(req, res) {
  try {
    if (!enforceRateLimit(req, res)) return;
    const templates = await getImgflipTemplates();
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');
    return res.status(200).json({ success: true, data: templates });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || 'templates_failed' });
  }
}
