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

export default app;
