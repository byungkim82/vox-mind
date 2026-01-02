import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env, AuthContext } from './lib/types';
import { transcribeAudio } from './lib/groq-client';
import { structureMemo } from './lib/gemini-client';
import { generateEmbedding } from './lib/voyage-client';
import { createAuthMiddleware, getAuth } from './lib/auth-middleware';

type AppEnv = { Bindings: Env; Variables: { auth: AuthContext } };

const app = new Hono<AppEnv>();

// CORS middleware - environment-based origins
app.use('/*', cors({
  origin: (origin, c) => {
    const allowedOrigins = c.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3001',
    ];
    if (!origin) return null;
    if (allowedOrigins.includes(origin)) return origin;
    return null;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Cf-Access-Jwt-Assertion'],
  credentials: true,
}));

// Auth middleware for protected routes
const authMiddleware = createAuthMiddleware();

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

// Upload endpoint (protected)
app.post('/api/upload', authMiddleware, async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body['file'];

    if (!file || !(file instanceof File)) {
      return c.json({ error: 'No file provided' }, 400);
    }

    // Validate type (allow codecs suffix like audio/webm;codecs=opus)
    const validPrefixes = ['audio/webm', 'audio/mp4', 'audio/wav', 'audio/mpeg', 'audio/m4a', 'audio/x-m4a', 'audio/aac'];
    const isValidType = validPrefixes.some(prefix => file.type.startsWith(prefix));
    if (!isValidType) {
      return c.json({
        error: `Invalid file type: ${file.type}. Supported: webm, mp4, wav, mpeg, m4a, aac`
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
    // Extract extension (handle codecs like audio/webm;codecs=opus -> webm)
    const mimeBase = file.type.split(';')[0]; // Remove codecs suffix
    const extension = mimeBase.split('/')[1] || 'webm';
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

// Process pipeline endpoint (protected)
app.post('/api/process', authMiddleware, async (c) => {
  try {
    const { fileId, fileName } = await c.req.json();

    if (!fileId || !fileName) {
      return c.json({ error: 'fileId and fileName required' }, 400);
    }

    console.log(`[${fileId}] Starting process pipeline...`);

    // 1. Get file from R2
    const file = await c.env.AUDIO_BUCKET.get(fileName);
    if (!file) {
      return c.json({ error: 'File not found in R2' }, 404);
    }

    const audioBuffer = await file.arrayBuffer();
    console.log(`[${fileId}] Retrieved from R2: ${audioBuffer.byteLength} bytes`);

    // 2. STT with Groq
    console.log(`[${fileId}] Starting STT...`);
    const rawText = await transcribeAudio(audioBuffer, fileName, c.env);
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
    const auth = getAuth(c);
    const userId = auth.userId;

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

    // 6. Save to Vectorize (skip in local dev - not supported)
    if (c.env.VECTORIZE?.insert) {
      await c.env.VECTORIZE.insert([{
        id: memoId,
        values: embedding,
        metadata: { memo_id: memoId, user_id: userId }
      }]);
      console.log(`[${fileId}] Saved to Vectorize`);
    } else {
      console.log(`[${fileId}] Vectorize skipped (local dev)`);
    }

    // 7. Delete from R2
    await c.env.AUDIO_BUCKET.delete(fileName);
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
