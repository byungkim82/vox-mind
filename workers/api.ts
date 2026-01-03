import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env, AuthContext, WorkflowResult } from './lib/types';
import { createAuthMiddleware, getAuth } from './lib/auth-middleware';

// Export Workflow for wrangler
export { ProcessMemoWorkflow } from './workflows/process-memo';

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
    ai: !!c.env.AI,
    workflow: !!c.env.PROCESS_WORKFLOW,
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

// Process pipeline endpoint - triggers Workflow (protected)
app.post('/api/process', authMiddleware, async (c) => {
  try {
    const { fileId, fileName } = await c.req.json();

    if (!fileId || !fileName) {
      return c.json({ error: 'fileId and fileName required' }, 400);
    }

    const auth = getAuth(c);
    console.log(`[${fileId}] Workflow 생성 중...`);

    // Create Workflow instance
    const instance = await c.env.PROCESS_WORKFLOW.create({
      params: {
        fileId,
        fileName,
        userId: auth.userId,
      },
    });

    console.log(`[${fileId}] Workflow 생성 완료: ${instance.id}`);

    return c.json({
      instanceId: instance.id,
      status: 'queued',
      message: '처리가 시작되었습니다',
    });

  } catch (error) {
    console.error('Process error:', error);
    return c.json({
      error: '처리 시작 실패',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Get Workflow status endpoint (protected)
app.get('/api/process/:instanceId', authMiddleware, async (c) => {
  try {
    const instanceId = c.req.param('instanceId');

    const instance = await c.env.PROCESS_WORKFLOW.get(instanceId);
    const status = await instance.status();

    return c.json({
      instanceId,
      status: status.status,
      output: status.output as WorkflowResult | undefined,
      error: status.error?.message,
    });

  } catch (error) {
    console.error('Status check error:', error);
    return c.json({
      error: '상태 확인 실패',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// ============================================================
// Phase 2: Memo Management API
// ============================================================

// GET /api/memos - List memos with pagination and filtering
app.get('/api/memos', authMiddleware, async (c) => {
  try {
    const auth = getAuth(c);
    const category = c.req.query('category');
    const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
    const offset = parseInt(c.req.query('offset') || '0');

    // Build query with optional category filter
    let query = `
      SELECT id, title, summary, category, created_at, updated_at
      FROM memos
      WHERE user_id = ?
    `;
    const params: (string | number)[] = [auth.userId];

    if (category && category !== 'all') {
      query += ` AND category = ?`;
      params.push(category);
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const { results } = await c.env.DB.prepare(query).bind(...params).all();

    // Get total count
    let countQuery = `SELECT COUNT(*) as count FROM memos WHERE user_id = ?`;
    const countParams: string[] = [auth.userId];
    if (category && category !== 'all') {
      countQuery += ` AND category = ?`;
      countParams.push(category);
    }
    const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first<{ count: number }>();

    return c.json({
      memos: results,
      total: countResult?.count || 0,
      limit,
      offset,
    });

  } catch (error) {
    console.error('Get memos error:', error);
    return c.json({
      error: '메모 목록 조회 실패',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// GET /api/memos/:id - Get single memo detail
app.get('/api/memos/:id', authMiddleware, async (c) => {
  try {
    const auth = getAuth(c);
    const memoId = c.req.param('id');

    const memo = await c.env.DB.prepare(`
      SELECT * FROM memos WHERE id = ? AND user_id = ?
    `).bind(memoId, auth.userId).first();

    if (!memo) {
      return c.json({ error: '메모를 찾을 수 없습니다' }, 404);
    }

    // Parse action_items JSON
    const result = {
      ...memo,
      action_items: memo.action_items ? JSON.parse(memo.action_items as string) : [],
    };

    return c.json(result);

  } catch (error) {
    console.error('Get memo error:', error);
    return c.json({
      error: '메모 조회 실패',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// DELETE /api/memos/:id - Delete memo
app.delete('/api/memos/:id', authMiddleware, async (c) => {
  try {
    const auth = getAuth(c);
    const memoId = c.req.param('id');

    // Check if memo exists and belongs to user
    const memo = await c.env.DB.prepare(`
      SELECT id FROM memos WHERE id = ? AND user_id = ?
    `).bind(memoId, auth.userId).first();

    if (!memo) {
      return c.json({ error: '메모를 찾을 수 없습니다' }, 404);
    }

    // Delete from D1
    await c.env.DB.prepare(`
      DELETE FROM memos WHERE id = ? AND user_id = ?
    `).bind(memoId, auth.userId).run();

    // Delete from Vectorize
    try {
      await c.env.VECTORIZE.deleteByIds([memoId]);
    } catch (vectorError) {
      console.error('Vectorize delete error (non-fatal):', vectorError);
    }

    return c.json({ success: true, message: '메모가 삭제되었습니다' });

  } catch (error) {
    console.error('Delete memo error:', error);
    return c.json({
      error: '메모 삭제 실패',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// ============================================================
// Phase 3: RAG Chat API
// ============================================================

// POST /api/chat - RAG-based chat
app.post('/api/chat', authMiddleware, async (c) => {
  try {
    const auth = getAuth(c);
    const { question } = await c.req.json<{ question: string }>();

    if (!question || question.trim().length === 0) {
      return c.json({ error: '질문을 입력해주세요' }, 400);
    }

    // Step 1: Generate embedding for the question
    const embeddingResponse = await c.env.AI.run('@cf/baai/bge-m3', {
      text: [question],
    }) as { data: number[][] };

    const questionEmbedding = embeddingResponse.data[0];

    // Step 2: Search Vectorize for similar memos
    console.log('[RAG] Searching with user_id:', auth.userId);

    const searchResults = await c.env.VECTORIZE.query(questionEmbedding, {
      topK: 5,
      filter: { user_id: auth.userId },
      returnMetadata: 'all',
    });

    console.log('[RAG] Search results:', JSON.stringify({
      count: searchResults.count,
      matchesLength: searchResults.matches?.length || 0,
      matches: searchResults.matches?.map(m => ({ id: m.id, score: m.score, metadata: m.metadata }))
    }));

    if (!searchResults.matches || searchResults.matches.length === 0) {
      // Debug: Try searching without filter to see if it's a filter issue
      const debugResults = await c.env.VECTORIZE.query(questionEmbedding, {
        topK: 5,
        returnMetadata: 'all',
      });
      console.log('[RAG] Debug search without filter:', JSON.stringify({
        count: debugResults.count,
        matches: debugResults.matches?.map(m => ({ id: m.id, metadata: m.metadata }))
      }));

      return c.json({
        answer: '관련된 메모를 찾을 수 없습니다. 먼저 음성 메모를 녹음해주세요.',
        sources: [],
      });
    }

    // Step 3: Fetch memo details from D1
    const memoIds = searchResults.matches.map(m => m.id);
    const placeholders = memoIds.map(() => '?').join(',');
    const { results: memos } = await c.env.DB.prepare(`
      SELECT id, title, summary, raw_text, category, created_at
      FROM memos
      WHERE id IN (${placeholders}) AND user_id = ?
    `).bind(...memoIds, auth.userId).all();

    if (!memos || memos.length === 0) {
      return c.json({
        answer: '관련된 메모를 찾을 수 없습니다.',
        sources: [],
      });
    }

    // Step 4: Build context for LLM
    const context = memos.map((memo, i) => {
      const date = new Date(memo.created_at as string).toLocaleDateString('ko-KR');
      return `[메모 ${i + 1}] (${date}, ${memo.category || '기타'})
제목: ${memo.title || '제목 없음'}
요약: ${memo.summary || '요약 없음'}
내용: ${memo.raw_text}`;
    }).join('\n\n---\n\n');

    // Step 5: Generate answer using LLM
    const prompt = `당신은 사용자의 음성 메모를 기반으로 질문에 답변하는 AI 어시스턴트입니다.

아래는 사용자의 질문과 관련된 메모들입니다:

${context}

---

사용자 질문: ${question}

위 메모 내용만을 참고하여 질문에 답변해주세요.
- 메모에 없는 정보는 추측하지 마세요.
- 답변은 자연스럽고 친근하게 작성해주세요.
- 관련 메모가 있다면 어떤 메모에서 정보를 찾았는지 간단히 언급해주세요.
- 한국어로 답변해주세요.`;

    const llmResponse = await c.env.AI.run('@cf/meta/llama-4-scout-17b-16e-instruct', {
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1024,
    }) as { response?: string };

    const answer = llmResponse.response || '답변을 생성하지 못했습니다.';

    // Format sources for response
    const sources = memos.map(memo => ({
      id: memo.id,
      title: memo.title || '제목 없음',
      summary: memo.summary || '',
      category: memo.category || '기타',
      created_at: memo.created_at,
    }));

    return c.json({ answer, sources });

  } catch (error) {
    console.error('Chat error:', error);
    return c.json({
      error: 'AI 답변 생성 실패',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

export default app;
