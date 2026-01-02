import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from '../lib/types';
import { transcribeAudio } from './lib/groq-client';
import { structureMemo } from './lib/gemini-client';
import { generateEmbedding } from './lib/voyage-client';

const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use('/*', cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Health check
app.get('/', (c) => {
  return c.json({
    service: 'vox-mind-api',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    database: !!c.env.DB,
    r2: !!c.env.AUDIO_BUCKET,
    vectorize: !!c.env.VECTORIZE,
    groq: !!c.env.GROQ_API_KEY,
    gemini: !!c.env.GEMINI_API_KEY,
    voyage: !!c.env.VOYAGE_API_KEY,
  });
});

// Upload endpoint
app.post('/api/upload', async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body['file'];

    if (!file || !(file instanceof File)) {
      return c.json({ error: 'No file provided' }, 400);
    }

    // Validate type
    const validTypes = ['audio/webm', 'audio/mp4', 'audio/wav', 'audio/mpeg'];
    if (!validTypes.includes(file.type)) {
      return c.json({
        error: `Invalid file type: ${file.type}. Supported: webm, mp4, wav, mpeg`
      }, 400);
    }

    // Validate size (50MB)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return c.json({
        error: `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Max: 50MB`
      }, 413);
    }

    // Upload to R2
    const fileId = crypto.randomUUID();
    const extension = file.type.split('/')[1] || 'webm';
    const fileName = `${fileId}.${extension}`;

    await c.env.AUDIO_BUCKET.put(fileName, file.stream());

    return c.json({
      fileId,
      fileName,
      uploadedAt: new Date().toISOString(),
      size: file.size,
      type: file.type,
    });

  } catch (error) {
    console.error('Upload error:', error);
    return c.json({
      error: 'Upload failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Process pipeline endpoint
app.post('/api/process', async (c) => {
  try {
    const { fileId } = await c.req.json();

    if (!fileId) {
      return c.json({ error: 'fileId required' }, 400);
    }

    console.log(`[${fileId}] Starting process pipeline...`);

    // 1. Get file from R2
    const file = await c.env.AUDIO_BUCKET.get(`${fileId}.webm`);
    if (!file) {
      return c.json({ error: 'File not found in R2' }, 404);
    }

    const audioBuffer = await file.arrayBuffer();
    console.log(`[${fileId}] Retrieved from R2: ${audioBuffer.byteLength} bytes`);

    // 2. STT with Groq
    console.log(`[${fileId}] Starting STT...`);
    const rawText = await transcribeAudio(audioBuffer, c.env);
    console.log(`[${fileId}] STT complete: ${rawText.length} chars`);

    // 3. Structure with Gemini
    console.log(`[${fileId}] Starting structuring...`);
    const structure = await structureMemo(rawText, c.env);
    console.log(`[${fileId}] Structured: ${structure.title}`);

    // 4. Embed with Voyage
    console.log(`[${fileId}] Starting embedding...`);
    const embedding = await generateEmbedding(structure.summary, c.env);
    console.log(`[${fileId}] Embedding: ${embedding.length}d`);

    // 5. Save to D1
    const memoId = crypto.randomUUID();
    const userId = 'temp-user'; // TODO: JWT in Phase 3

    await c.env.DB.prepare(`
      INSERT INTO memos (id, user_id, raw_text, title, summary, category, action_items)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      memoId,
      userId,
      rawText,
      structure.title,
      structure.summary,
      structure.category,
      JSON.stringify(structure.action_items)
    ).run();

    console.log(`[${fileId}] Saved to D1: ${memoId}`);

    // 6. Save to Vectorize
    await c.env.VECTORIZE.insert([{
      id: memoId,
      values: embedding,
      metadata: { memo_id: memoId, user_id: userId }
    }]);

    console.log(`[${fileId}] Saved to Vectorize`);

    // 7. Delete from R2
    await c.env.AUDIO_BUCKET.delete(`${fileId}.webm`);
    console.log(`[${fileId}] Deleted from R2`);

    return c.json({
      memoId,
      title: structure.title,
      summary: structure.summary,
      category: structure.category,
      actionItems: structure.action_items,
      rawTextLength: rawText.length,
    });

  } catch (error) {
    console.error('Process error:', error);
    return c.json({
      error: 'Processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

export default app;
