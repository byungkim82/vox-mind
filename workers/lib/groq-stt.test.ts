import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { transcribeWithGroq } from './groq-stt';
import type { Env } from './types';

describe('groq-stt', () => {
  const mockEnv: Pick<Env, 'GROQ_API_KEY'> = {
    GROQ_API_KEY: 'test-groq-api-key',
  };

  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.resetAllMocks();
  });

  describe('transcribeWithGroq', () => {
    it('transcribes audio successfully', async () => {
      const mockResponse = {
        text: '안녕하세요, 오늘 회의 내용입니다.',
        x_groq: { id: 'req-123' },
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await transcribeWithGroq(
        'https://r2.example.com/audio.webm',
        mockEnv as Env
      );

      expect(result).toBe('안녕하세요, 오늘 회의 내용입니다.');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.groq.com/openai/v1/audio/transcriptions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: 'Bearer test-groq-api-key',
          },
        })
      );
    });

    it('sends correct FormData parameters', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ text: 'Test' }),
      } as Response);

      let capturedBody: FormData | undefined;
      vi.mocked(global.fetch).mockImplementation(async (_, init) => {
        capturedBody = init?.body as FormData;
        return {
          ok: true,
          json: () => Promise.resolve({ text: 'Test' }),
        } as Response;
      });

      await transcribeWithGroq('https://r2.example.com/audio.webm', mockEnv as Env);

      expect(capturedBody).toBeInstanceOf(FormData);
      expect(capturedBody?.get('url')).toBe('https://r2.example.com/audio.webm');
      expect(capturedBody?.get('model')).toBe('whisper-large-v3-turbo');
      expect(capturedBody?.get('language')).toBe('ko');
      expect(capturedBody?.get('response_format')).toBe('json');
    });

    it('handles Korean and English mixed content', async () => {
      const mockResponse = {
        text: 'useState hook을 사용해서 React 컴포넌트를 만들어보겠습니다.',
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await transcribeWithGroq(
        'https://r2.example.com/audio.webm',
        mockEnv as Env
      );

      expect(result).toBe('useState hook을 사용해서 React 컴포넌트를 만들어보겠습니다.');
    });

    it('throws error on HTTP failure with JSON error message', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 400,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              error: {
                message: 'Invalid audio format',
                type: 'invalid_request_error',
              },
            })
          ),
      } as Response);

      await expect(
        transcribeWithGroq('https://r2.example.com/invalid.txt', mockEnv as Env)
      ).rejects.toThrow('Groq STT 실패: Invalid audio format');
    });

    it('throws error on HTTP failure with plain text error', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      } as Response);

      await expect(
        transcribeWithGroq('https://r2.example.com/audio.webm', mockEnv as Env)
      ).rejects.toThrow('Groq STT 실패: 500 - Internal Server Error');
    });

    it('throws error on 401 unauthorized', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 401,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              error: {
                message: 'Invalid API key',
                type: 'authentication_error',
              },
            })
          ),
      } as Response);

      await expect(
        transcribeWithGroq('https://r2.example.com/audio.webm', mockEnv as Env)
      ).rejects.toThrow('Groq STT 실패: Invalid API key');
    });

    it('throws error when response has no text', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ x_groq: { id: 'req-123' } }),
      } as Response);

      await expect(
        transcribeWithGroq('https://r2.example.com/audio.webm', mockEnv as Env)
      ).rejects.toThrow('Groq STT: 전사 텍스트 없음');
    });

    it('throws error when response text is empty string', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ text: '' }),
      } as Response);

      await expect(
        transcribeWithGroq('https://r2.example.com/audio.webm', mockEnv as Env)
      ).rejects.toThrow('Groq STT: 전사 텍스트 없음');
    });

    it('handles rate limiting error', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 429,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              error: {
                message: 'Rate limit exceeded',
                type: 'rate_limit_error',
              },
            })
          ),
      } as Response);

      await expect(
        transcribeWithGroq('https://r2.example.com/audio.webm', mockEnv as Env)
      ).rejects.toThrow('Groq STT 실패: Rate limit exceeded');
    });

    it('handles network error', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      await expect(
        transcribeWithGroq('https://r2.example.com/audio.webm', mockEnv as Env)
      ).rejects.toThrow('Network error');
    });

    it('handles malformed JSON error response', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 503,
        text: () => Promise.resolve('Service Unavailable'),
      } as Response);

      await expect(
        transcribeWithGroq('https://r2.example.com/audio.webm', mockEnv as Env)
      ).rejects.toThrow('Groq STT 실패: 503 - Service Unavailable');
    });

    it('does not set Content-Type header manually (FormData sets it)', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ text: 'Test' }),
      } as Response);

      await transcribeWithGroq('https://r2.example.com/audio.webm', mockEnv as Env);

      const callArgs = vi.mocked(global.fetch).mock.calls[0];
      const headers = callArgs[1]?.headers as Record<string, string>;

      // Content-Type should not be manually set
      expect(headers['Content-Type']).toBeUndefined();
      expect(headers['Authorization']).toBe('Bearer test-groq-api-key');
    });
  });
});
