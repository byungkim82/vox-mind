import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import {
  uploadAudio,
  startProcessing,
  getMemos,
  getMemo,
  deleteMemo,
  getAudioUrl,
  sendChatMessage,
} from './client';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('uploadAudio', () => {
  it('uploads audio blob successfully', async () => {
    server.use(
      http.post('/api/upload', () => {
        return HttpResponse.json({
          fileId: 'test-file-id',
          fileName: 'recording.webm',
          uploadedAt: '2024-01-15T10:00:00Z',
          size: 1024,
          type: 'audio/webm',
        });
      })
    );

    const blob = new Blob(['test audio data'], { type: 'audio/webm' });
    const result = await uploadAudio(blob);

    expect(result.fileId).toBe('test-file-id');
    expect(result.fileName).toBe('recording.webm');
    expect(result.size).toBe(1024);
  });

  it('throws error on upload failure', async () => {
    server.use(
      http.post('/api/upload', () => {
        return HttpResponse.json({ error: 'File too large' }, { status: 413 });
      })
    );

    const blob = new Blob(['test'], { type: 'audio/webm' });
    await expect(uploadAudio(blob)).rejects.toThrow('File too large');
  });

  it('throws default error when error message is missing', async () => {
    server.use(
      http.post('/api/upload', () => {
        return HttpResponse.json({}, { status: 500 });
      })
    );

    const blob = new Blob(['test'], { type: 'audio/webm' });
    await expect(uploadAudio(blob)).rejects.toThrow('업로드 실패');
  });
});

describe('startProcessing', () => {
  it('starts processing successfully', async () => {
    server.use(
      http.post('/api/process', () => {
        return HttpResponse.json({
          instanceId: 'workflow-123',
          status: 'queued',
          message: '처리가 시작되었습니다',
        });
      })
    );

    const result = await startProcessing('file-id', 'recording.webm');

    expect(result.instanceId).toBe('workflow-123');
    expect(result.status).toBe('queued');
  });

  it('throws error on failure', async () => {
    server.use(
      http.post('/api/process', () => {
        return HttpResponse.json({ error: 'Processing failed' }, { status: 500 });
      })
    );

    await expect(startProcessing('file-id', 'recording.webm')).rejects.toThrow('Processing failed');
  });
});

describe('getMemos', () => {
  it('fetches memos with default params', async () => {
    server.use(
      http.get('/api/memos', () => {
        return HttpResponse.json({
          memos: [
            { id: '1', title: 'Test Memo', summary: 'Summary', category: '개발', created_at: '2024-01-15T10:00:00Z' },
          ],
          total: 1,
          limit: 20,
          offset: 0,
        });
      })
    );

    const result = await getMemos();

    expect(result.memos).toHaveLength(1);
    expect(result.memos[0].title).toBe('Test Memo');
    expect(result.total).toBe(1);
  });

  it('includes category filter in request', async () => {
    let capturedUrl = '';

    server.use(
      http.get('/api/memos', ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({ memos: [], total: 0, limit: 20, offset: 0 });
      })
    );

    await getMemos({ category: '개발', limit: 10, offset: 5 });

    expect(capturedUrl).toContain('category=');
    expect(capturedUrl).toContain('limit=10');
    expect(capturedUrl).toContain('offset=5');
  });

  it('excludes "all" category from request', async () => {
    let capturedUrl = '';

    server.use(
      http.get('/api/memos', ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({ memos: [], total: 0, limit: 20, offset: 0 });
      })
    );

    await getMemos({ category: 'all' });

    expect(capturedUrl).not.toContain('category=');
  });

  it('throws error on failure', async () => {
    server.use(
      http.get('/api/memos', () => {
        return HttpResponse.json({ error: 'Database error' }, { status: 500 });
      })
    );

    await expect(getMemos()).rejects.toThrow('Database error');
  });
});

describe('getMemo', () => {
  it('fetches memo by id', async () => {
    server.use(
      http.get('/api/memos/memo-123', () => {
        return HttpResponse.json({
          id: 'memo-123',
          user_id: 'user-1',
          raw_text: 'Full transcription text',
          title: 'Test Memo',
          summary: 'Summary',
          category: '개발',
          action_items: ['Task 1', 'Task 2'],
          audio_file_name: 'recording.webm',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
        });
      })
    );

    const result = await getMemo('memo-123');

    expect(result.id).toBe('memo-123');
    expect(result.title).toBe('Test Memo');
    expect(result.action_items).toEqual(['Task 1', 'Task 2']);
  });

  it('throws error when memo not found', async () => {
    server.use(
      http.get('/api/memos/non-existent', () => {
        return HttpResponse.json({ error: '메모를 찾을 수 없습니다' }, { status: 404 });
      })
    );

    await expect(getMemo('non-existent')).rejects.toThrow('메모를 찾을 수 없습니다');
  });
});

describe('deleteMemo', () => {
  it('deletes memo successfully', async () => {
    server.use(
      http.delete('/api/memos/memo-123', () => {
        return HttpResponse.json({
          success: true,
          message: '메모가 삭제되었습니다',
        });
      })
    );

    const result = await deleteMemo('memo-123');

    expect(result.success).toBe(true);
    expect(result.message).toBe('메모가 삭제되었습니다');
  });

  it('throws error on delete failure', async () => {
    server.use(
      http.delete('/api/memos/memo-123', () => {
        return HttpResponse.json({ error: '삭제 권한이 없습니다' }, { status: 403 });
      })
    );

    await expect(deleteMemo('memo-123')).rejects.toThrow('삭제 권한이 없습니다');
  });
});

describe('getAudioUrl', () => {
  it('fetches audio URL successfully', async () => {
    server.use(
      http.get('/api/memos/memo-123/audio', () => {
        return HttpResponse.json({
          audioUrl: 'https://r2.example.com/audio/recording.webm?signature=abc123',
        });
      })
    );

    const result = await getAudioUrl('memo-123');

    expect(result.audioUrl).toContain('https://');
  });

  it('throws error when audio not available', async () => {
    server.use(
      http.get('/api/memos/memo-123/audio', () => {
        return HttpResponse.json({ error: '오디오 파일이 없습니다' }, { status: 404 });
      })
    );

    await expect(getAudioUrl('memo-123')).rejects.toThrow('오디오 파일이 없습니다');
  });
});

describe('sendChatMessage', () => {
  it('sends question and returns answer with sources', async () => {
    server.use(
      http.post('/api/chat', () => {
        return HttpResponse.json({
          answer: 'Based on your memos, the project deadline is next Friday.',
          sources: [
            {
              id: 'memo-1',
              title: 'Project Meeting Notes',
              summary: 'Discussed project timeline',
              category: '업무',
              created_at: '2024-01-15T10:00:00Z',
            },
          ],
        });
      })
    );

    const result = await sendChatMessage('When is the project deadline?');

    expect(result.answer).toContain('next Friday');
    expect(result.sources).toHaveLength(1);
    expect(result.sources[0].title).toBe('Project Meeting Notes');
  });

  it('returns empty sources when no relevant memos found', async () => {
    server.use(
      http.post('/api/chat', () => {
        return HttpResponse.json({
          answer: '관련된 메모를 찾을 수 없습니다.',
          sources: [],
        });
      })
    );

    const result = await sendChatMessage('Unrelated question');

    expect(result.sources).toHaveLength(0);
  });

  it('throws error on chat failure', async () => {
    server.use(
      http.post('/api/chat', () => {
        return HttpResponse.json({ error: 'AI 서비스 오류' }, { status: 503 });
      })
    );

    await expect(sendChatMessage('Test question')).rejects.toThrow('AI 서비스 오류');
  });
});
