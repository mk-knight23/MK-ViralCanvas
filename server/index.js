import express from 'express';
import cors from 'cors';
import templatesHandler from '../api/memes/templates.mjs';
import searchHandler from '../api/memes/search.mjs';
import trendingHandler from '../api/memes/trending.mjs';
import categoryHandler from '../api/memes/category/[category].mjs';
import categoriesHandler from '../api/categories.mjs';
import sourcesHandler from '../api/sources.mjs';
import healthHandler from '../api/health.mjs';
import { getActiveSources } from '../api/_lib/memes.mjs';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

function adapt(handler) {
  return async (req, res, next) => {
    try {
      req.url = req.originalUrl;
      await handler(req, res);
    } catch (err) {
      next(err);
    }
  };
}

app.get('/api/memes/templates', adapt(templatesHandler));
app.get('/api/memes/search', adapt(searchHandler));
app.get('/api/memes/trending', adapt(trendingHandler));
app.get('/api/memes/category/:category', (req, res, next) => {
  req.query.category = req.params.category;
  adapt(categoryHandler)(req, res, next);
});
app.get('/api/categories', adapt(categoriesHandler));
app.get('/api/sources', adapt(sourcesHandler));
app.get('/api/health', adapt(healthHandler));

app.listen(PORT, '0.0.0.0', () => {
  const sources = getActiveSources();
  // eslint-disable-next-line no-console
  console.log(`[dev-api] listening on :${PORT}. active sources (${sources.length}): ${sources.join(', ')}`);
});
