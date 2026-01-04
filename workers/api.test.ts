import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

// Mock cloudflare:workers before importing the api
vi.mock('cloudflare:workers', () => ({
  WorkflowEntrypoint: class {},
  WorkflowStep: class {},
  WorkflowEvent: class {},
}));

// Mock dependencies
vi.mock('./lib/auth-middleware', () => ({
  createAuthMiddleware: () => async (c: any, next: any) => {
    c.set('auth', { userId: 'test-user-id', email: 'test@example.com' });
    await next();
  },
  getAuth: (c: any) => c.get('auth'),
}));

vi.mock('./lib/r2-presigned', () => ({
  generatePresignedUrl: vi.fn().mockResolvedValue('https://r2.example.com/presigned-url'),
}));

vi.mock('./lib/error-handler', () => ({
  createErrorResponse: (c: any, message: string, error: unknown, status = 500) => {
    const details = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: message, details }, status);
  },
}));

vi.mock('./lib/logger', () => ({
  apiLogger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  ragLogger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import after mocks are set up
import app from './api';

describe('workers/api', () => {
  // Create mock environment
  const createMockEnv = (overrides = {}) => ({
    DB: {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      all: vi.fn().mockResolvedValue({ results: [] }),
      first: vi.fn().mockResolvedValue(null),
      run: vi.fn().mockResolvedValue({}),
    },
    AUDIO_BUCKET: {
      put: vi.fn().mockResolvedValue({}),
      get: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue({}),
    },
    VECTORIZE: {
      query: vi.fn().mockResolvedValue({ matches: [] }),
      insert: vi.fn().mockResolvedValue({}),
      deleteByIds: vi.fn().mockResolvedValue({}),
    },
    AI: {
      run: vi.fn().mockResolvedValue({ data: [[0.1, 0.2, 0.3]] }),
    },
    PROCESS_WORKFLOW: {
      create: vi.fn().mockResolvedValue({ id: 'workflow-instance-id' }),
      get: vi.fn().mockResolvedValue({
        status: vi.fn().mockResolvedValue({ status: 'complete', output: {} }),
      }),
    },
    ALLOWED_ORIGINS: 'http://localhost:3000',
    ...overrides,
  });

  describe('Health endpoints', () => {
    it('GET / returns service info', async () => {
      const res = await app.request('/', {}, createMockEnv());
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.service).toBe('vox-mind-api');
      expect(body.status).toBe('healthy');
      expect(body.timestamp).toBeDefined();
    });

    it('GET /health returns detailed status', async () => {
      const env = createMockEnv();
      const res = await app.request('/health', {}, env);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.status).toBe('ok');
      expect(body.database).toBe(true);
      expect(body.r2).toBe(true);
      expect(body.vectorize).toBe(true);
      expect(body.ai).toBe(true);
      expect(body.workflow).toBe(true);
    });
  });

  describe('POST /api/upload', () => {
    it('uploads file successfully', async () => {
      const env = createMockEnv();
      const formData = new FormData();
      const blob = new Blob(['audio data'], { type: 'audio/webm' });
      formData.append('file', blob, 'recording.webm');

      const res = await app.request(
        '/api/upload',
        {
          method: 'POST',
          body: formData,
        },
        env
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.fileId).toBeDefined();
      expect(body.fileName).toMatch(/\.webm$/);
      expect(body.uploadedAt).toBeDefined();
      expect(body.size).toBe(10);
      expect(body.type).toBe('audio/webm');
      expect(env.AUDIO_BUCKET.put).toHaveBeenCalled();
    });

    it('rejects request without file', async () => {
      const env = createMockEnv();
      const formData = new FormData();

      const res = await app.request(
        '/api/upload',
        {
          method: 'POST',
          body: formData,
        },
        env
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe('No file provided');
    });

    it('rejects invalid file type', async () => {
      const env = createMockEnv();
      const formData = new FormData();
      const blob = new Blob(['text'], { type: 'text/plain' });
      formData.append('file', blob, 'test.txt');

      const res = await app.request(
        '/api/upload',
        {
          method: 'POST',
          body: formData,
        },
        env
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toContain('Invalid file type');
    });

    it('accepts audio/webm;codecs=opus', async () => {
      const env = createMockEnv();
      const formData = new FormData();
      const blob = new Blob(['audio data'], { type: 'audio/webm;codecs=opus' });
      formData.append('file', blob, 'recording.webm');

      const res = await app.request(
        '/api/upload',
        {
          method: 'POST',
          body: formData,
        },
        env
      );

      expect(res.status).toBe(200);
    });

    it('rejects file exceeding size limit', async () => {
      const env = createMockEnv();
      const formData = new FormData();
      // Create a mock file with size property
      const largeBlob = new Blob(['x'.repeat(51 * 1024 * 1024)]); // 51MB
      Object.defineProperty(largeBlob, 'type', { value: 'audio/webm' });
      formData.append('file', largeBlob, 'large.webm');

      const res = await app.request(
        '/api/upload',
        {
          method: 'POST',
          body: formData,
        },
        env
      );
      const body = await res.json();

      expect(res.status).toBe(413);
      expect(body.error).toContain('File too large');
    });
  });

  describe('POST /api/process', () => {
    it('triggers workflow successfully', async () => {
      const env = createMockEnv();

      const res = await app.request(
        '/api/process',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId: 'file-123', fileName: 'recording.webm' }),
        },
        env
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.instanceId).toBe('workflow-instance-id');
      expect(body.status).toBe('queued');
      expect(env.PROCESS_WORKFLOW.create).toHaveBeenCalledWith({
        params: {
          fileId: 'file-123',
          fileName: 'recording.webm',
          userId: 'test-user-id',
        },
      });
    });

    it('rejects request without fileId', async () => {
      const env = createMockEnv();

      const res = await app.request(
        '/api/process',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: 'recording.webm' }),
        },
        env
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe('fileId and fileName required');
    });

    it('rejects request without fileName', async () => {
      const env = createMockEnv();

      const res = await app.request(
        '/api/process',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId: 'file-123' }),
        },
        env
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe('fileId and fileName required');
    });
  });

  describe('GET /api/process/:instanceId', () => {
    it('returns workflow status', async () => {
      const env = createMockEnv();

      const res = await app.request('/api/process/workflow-123', {}, env);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.instanceId).toBe('workflow-123');
      expect(body.status).toBe('complete');
      expect(env.PROCESS_WORKFLOW.get).toHaveBeenCalledWith('workflow-123');
    });

    it('includes error message when workflow failed', async () => {
      const env = createMockEnv({
        PROCESS_WORKFLOW: {
          get: vi.fn().mockResolvedValue({
            status: vi.fn().mockResolvedValue({
              status: 'failed',
              output: null,
              error: { message: 'STT failed' },
            }),
          }),
        },
      });

      const res = await app.request('/api/process/workflow-123', {}, env);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.status).toBe('failed');
      expect(body.error).toBe('STT failed');
    });
  });

  describe('GET /api/memos', () => {
    it('returns empty list when no memos', async () => {
      const env = createMockEnv();
      env.DB.first.mockResolvedValue({ count: 0 });

      const res = await app.request('/api/memos', {}, env);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.memos).toEqual([]);
      expect(body.total).toBe(0);
    });

    it('returns memos list', async () => {
      const mockMemos = [
        { id: '1', title: 'Memo 1', summary: 'Summary 1', category: '개발', created_at: '2024-01-15T10:00:00Z' },
        { id: '2', title: 'Memo 2', summary: 'Summary 2', category: '업무', created_at: '2024-01-14T10:00:00Z' },
      ];
      const env = createMockEnv();
      env.DB.all.mockResolvedValue({ results: mockMemos });
      env.DB.first.mockResolvedValue({ count: 2 });

      const res = await app.request('/api/memos', {}, env);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.memos).toHaveLength(2);
      expect(body.total).toBe(2);
    });

    it('applies category filter', async () => {
      const env = createMockEnv();
      env.DB.all.mockResolvedValue({ results: [] });
      env.DB.first.mockResolvedValue({ count: 0 });

      await app.request('/api/memos?category=개발', {}, env);

      // Check that bind was called with category
      expect(env.DB.bind).toHaveBeenCalled();
    });

    it('applies pagination parameters', async () => {
      const env = createMockEnv();
      env.DB.all.mockResolvedValue({ results: [] });
      env.DB.first.mockResolvedValue({ count: 0 });

      const res = await app.request('/api/memos?limit=10&offset=20', {}, env);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.limit).toBe(10);
      expect(body.offset).toBe(20);
    });

    it('limits maximum to 100', async () => {
      const env = createMockEnv();
      env.DB.all.mockResolvedValue({ results: [] });
      env.DB.first.mockResolvedValue({ count: 0 });

      const res = await app.request('/api/memos?limit=200', {}, env);
      const body = await res.json();

      expect(body.limit).toBe(100);
    });
  });

  describe('GET /api/memos/:id', () => {
    it('returns memo detail', async () => {
      const mockMemo = {
        id: 'memo-123',
        user_id: 'test-user-id',
        raw_text: 'Full transcription',
        title: 'Test Memo',
        summary: 'Summary',
        category: '개발',
        action_items: '["Task 1", "Task 2"]',
        audio_file_name: 'recording.webm',
        created_at: '2024-01-15T10:00:00Z',
      };
      const env = createMockEnv();
      env.DB.first.mockResolvedValue(mockMemo);

      const res = await app.request('/api/memos/memo-123', {}, env);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.id).toBe('memo-123');
      expect(body.title).toBe('Test Memo');
      expect(body.action_items).toEqual(['Task 1', 'Task 2']);
    });

    it('returns 404 when memo not found', async () => {
      const env = createMockEnv();
      env.DB.first.mockResolvedValue(null);

      const res = await app.request('/api/memos/non-existent', {}, env);
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error).toBe('메모를 찾을 수 없습니다');
    });

    it('handles null action_items', async () => {
      const mockMemo = {
        id: 'memo-123',
        title: 'Test',
        summary: 'Summary',
        category: '개발',
        action_items: null,
      };
      const env = createMockEnv();
      env.DB.first.mockResolvedValue(mockMemo);

      const res = await app.request('/api/memos/memo-123', {}, env);
      const body = await res.json();

      expect(body.action_items).toEqual([]);
    });
  });

  describe('GET /api/memos/:id/audio', () => {
    it('returns presigned audio URL', async () => {
      const env = createMockEnv();
      env.DB.first.mockResolvedValue({ audio_file_name: 'recording.webm' });

      const res = await app.request('/api/memos/memo-123/audio', {}, env);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.audioUrl).toBe('https://r2.example.com/presigned-url');
    });

    it('returns 404 when memo not found', async () => {
      const env = createMockEnv();
      env.DB.first.mockResolvedValue(null);

      const res = await app.request('/api/memos/memo-123/audio', {}, env);
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error).toBe('메모를 찾을 수 없습니다');
    });

    it('returns 404 when no audio file', async () => {
      const env = createMockEnv();
      env.DB.first.mockResolvedValue({ audio_file_name: null });

      const res = await app.request('/api/memos/memo-123/audio', {}, env);
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error).toBe('오디오 파일이 없습니다');
    });
  });

  describe('DELETE /api/memos/:id', () => {
    it('deletes memo successfully', async () => {
      const env = createMockEnv();
      env.DB.first.mockResolvedValue({ id: 'memo-123', audio_file_name: 'recording.webm' });

      const res = await app.request(
        '/api/memos/memo-123',
        { method: 'DELETE' },
        env
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(env.DB.run).toHaveBeenCalled();
      expect(env.VECTORIZE.deleteByIds).toHaveBeenCalledWith(['memo-123']);
      expect(env.AUDIO_BUCKET.delete).toHaveBeenCalledWith('recording.webm');
    });

    it('returns 404 when memo not found', async () => {
      const env = createMockEnv();
      env.DB.first.mockResolvedValue(null);

      const res = await app.request(
        '/api/memos/non-existent',
        { method: 'DELETE' },
        env
      );
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error).toBe('메모를 찾을 수 없습니다');
    });

    it('deletes memo without audio file', async () => {
      const env = createMockEnv();
      env.DB.first.mockResolvedValue({ id: 'memo-123', audio_file_name: null });

      const res = await app.request(
        '/api/memos/memo-123',
        { method: 'DELETE' },
        env
      );

      expect(res.status).toBe(200);
      expect(env.AUDIO_BUCKET.delete).not.toHaveBeenCalled();
    });

    it('continues even if Vectorize delete fails', async () => {
      const env = createMockEnv();
      env.DB.first.mockResolvedValue({ id: 'memo-123', audio_file_name: null });
      env.VECTORIZE.deleteByIds.mockRejectedValue(new Error('Vectorize error'));

      const res = await app.request(
        '/api/memos/memo-123',
        { method: 'DELETE' },
        env
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
    });
  });

  describe('POST /api/chat', () => {
    it('returns answer with sources', async () => {
      const mockMemos = [
        {
          id: 'memo-1',
          title: 'Meeting Notes',
          summary: 'Discussed project deadline',
          raw_text: 'The deadline is next Friday',
          category: '업무',
          created_at: '2024-01-15T10:00:00Z',
        },
      ];
      const env = createMockEnv();
      env.VECTORIZE.query.mockResolvedValue({
        matches: [{ id: 'memo-1', score: 0.9 }],
      });
      env.DB.all.mockResolvedValue({ results: mockMemos });
      env.AI.run.mockResolvedValueOnce({ data: [[0.1, 0.2, 0.3]] }); // embedding
      env.AI.run.mockResolvedValueOnce({ response: 'The deadline is next Friday.' }); // LLM

      const res = await app.request(
        '/api/chat',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: 'When is the deadline?' }),
        },
        env
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.answer).toBe('The deadline is next Friday.');
      expect(body.sources).toHaveLength(1);
      expect(body.sources[0].id).toBe('memo-1');
    });

    it('returns empty sources when no matches', async () => {
      const env = createMockEnv();
      env.VECTORIZE.query.mockResolvedValue({ matches: [] });

      const res = await app.request(
        '/api/chat',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: 'Unrelated question' }),
        },
        env
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.sources).toEqual([]);
      expect(body.answer).toContain('관련된 메모를 찾을 수 없습니다');
    });

    it('rejects empty question', async () => {
      const env = createMockEnv();

      const res = await app.request(
        '/api/chat',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: '' }),
        },
        env
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe('질문을 입력해주세요');
    });

    it('rejects whitespace-only question', async () => {
      const env = createMockEnv();

      const res = await app.request(
        '/api/chat',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: '   ' }),
        },
        env
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe('질문을 입력해주세요');
    });

    it('handles LLM returning empty response', async () => {
      const mockMemos = [
        { id: 'memo-1', title: 'Test', summary: 'Test', raw_text: 'Test', category: '기타', created_at: '2024-01-15T10:00:00Z' },
      ];
      const env = createMockEnv();
      env.VECTORIZE.query.mockResolvedValue({ matches: [{ id: 'memo-1', score: 0.9 }] });
      env.DB.all.mockResolvedValue({ results: mockMemos });
      env.AI.run.mockResolvedValueOnce({ data: [[0.1, 0.2, 0.3]] });
      env.AI.run.mockResolvedValueOnce({ response: '' });

      const res = await app.request(
        '/api/chat',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: 'Test question' }),
        },
        env
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.answer).toBe('답변을 생성하지 못했습니다.');
    });
  });

  describe('CORS', () => {
    it('allows configured origins', async () => {
      const env = createMockEnv();

      const res = await app.request(
        '/',
        {
          headers: { Origin: 'http://localhost:3000' },
        },
        env
      );

      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
    });

    it('handles OPTIONS preflight', async () => {
      const env = createMockEnv();

      const res = await app.request(
        '/api/memos',
        {
          method: 'OPTIONS',
          headers: { Origin: 'http://localhost:3000' },
        },
        env
      );

      expect(res.status).toBe(204);
    });
  });
});
