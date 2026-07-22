import { getImgflipTemplates } from '../_lib/memes.mjs';

export default async function handler(_req, res) {
  try {
    const templates = await getImgflipTemplates();
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');
    return res.status(200).json({ success: true, data: templates });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || 'templates_failed' });
  }
}
