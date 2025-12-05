/**
 * API Server Example
 *
 * Simple Express.js server that exposes tech translation as an API.
 */

import express from 'express';
import { translateTech } from '@omega/tech-translate';
import type { TranslateInput, TranslateOptions } from '@omega/tech-translate';

const app = express();
app.use(express.json());

app.post('/api/translate', async (req, res) => {
  try {
    const { input, options }: { input: TranslateInput; options?: TranslateOptions } = req.body;

    if (!input?.userRequest) {
      return res.status(400).json({ error: 'userRequest is required' });
    }

    const result = await translateTech(input, options);

    res.json(result);
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Tech Translate API server running on http://localhost:${PORT}`);
  console.log(`POST /api/translate - Translate user requests to technical specs`);
  console.log(`GET /health - Health check`);
});
