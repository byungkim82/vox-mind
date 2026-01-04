import { describe, it, expect, vi, beforeEach } from 'vitest';
import { structureWithWorkersAI } from './workers-ai-structure';
import type { Env } from './types';

describe('workers-ai-structure', () => {
  const createMockEnv = () => ({
    AI: {
      run: vi.fn(),
    },
  });

  describe('structureWithWorkersAI', () => {
    it('parses direct JSON response correctly', async () => {
      const mockEnv = createMockEnv();
      const mockResponse = {
        response: JSON.stringify({
          title: '회의록 정리',
          summary: '오늘 팀 미팅에서 프로젝트 일정을 논의했습니다.',
          category: '업무',
          action_items: ['기획서 작성', '디자인 검토'],
        }),
      };
      mockEnv.AI.run.mockResolvedValue(mockResponse);

      const result = await structureWithWorkersAI(
        '오늘 팀 미팅에서 프로젝트 일정을 논의했습니다.',
        mockEnv as unknown as Env
      );

      expect(result.title).toBe('회의록 정리');
      expect(result.summary).toBe('오늘 팀 미팅에서 프로젝트 일정을 논의했습니다.');
      expect(result.category).toBe('업무');
      expect(result.action_items).toEqual(['기획서 작성', '디자인 검토']);
    });

    it('extracts JSON from markdown code blocks', async () => {
      const mockEnv = createMockEnv();
      const mockResponse = {
        response: `Here is the structured memo:

\`\`\`json
{
  "title": "React 학습 노트",
  "summary": "useState와 useEffect 훅에 대해 공부했습니다.",
  "category": "학습",
  "action_items": []
}
\`\`\`

Let me know if you need more details.`,
      };
      mockEnv.AI.run.mockResolvedValue(mockResponse);

      const result = await structureWithWorkersAI(
        'useState와 useEffect에 대해 공부했습니다.',
        mockEnv as unknown as Env
      );

      expect(result.title).toBe('React 학습 노트');
      expect(result.category).toBe('학습');
    });

    it('preserves English words in Korean context', async () => {
      const mockEnv = createMockEnv();
      const mockResponse = {
        response: JSON.stringify({
          title: 'React hooks 사용법',
          summary: 'useState hook을 사용해서 상태 관리를 구현했습니다.',
          category: '개발',
          action_items: ['useEffect 추가', 'TypeScript 타입 정의'],
        }),
      };
      mockEnv.AI.run.mockResolvedValue(mockResponse);

      const result = await structureWithWorkersAI(
        'useState hook을 사용해서 상태 관리를 구현했습니다.',
        mockEnv as unknown as Env
      );

      // English words should be preserved
      expect(result.title).toContain('React');
      expect(result.summary).toContain('useState');
      expect(result.action_items).toContain('useEffect 추가');
    });

    it('calls AI with correct model and parameters', async () => {
      const mockEnv = createMockEnv();
      mockEnv.AI.run.mockResolvedValue({
        response: JSON.stringify({
          title: 'Test',
          summary: 'Summary',
          category: '기타',
          action_items: [],
        }),
      });

      await structureWithWorkersAI('Test input', mockEnv as unknown as Env);

      expect(mockEnv.AI.run).toHaveBeenCalledWith(
        '@cf/meta/llama-4-scout-17b-16e-instruct',
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('Test input'),
            }),
          ]),
          max_tokens: expect.any(Number),
          temperature: 0.3,
        })
      );
    });

    it('throws error when JSON extraction fails', async () => {
      const mockEnv = createMockEnv();
      mockEnv.AI.run.mockResolvedValue({
        response: 'This is not valid JSON and has no JSON in it.',
      });

      await expect(
        structureWithWorkersAI('Some input', mockEnv as unknown as Env)
      ).rejects.toThrow('Workers AI Structure: JSON 추출 실패');
    });

    it('throws error when title is missing', async () => {
      const mockEnv = createMockEnv();
      mockEnv.AI.run.mockResolvedValue({
        response: JSON.stringify({
          summary: 'Summary text',
          category: '기타',
          action_items: [],
        }),
      });

      await expect(
        structureWithWorkersAI('Some input', mockEnv as unknown as Env)
      ).rejects.toThrow('Workers AI Structure: 필수 필드 누락');
    });

    it('throws error when summary is missing', async () => {
      const mockEnv = createMockEnv();
      mockEnv.AI.run.mockResolvedValue({
        response: JSON.stringify({
          title: 'Title',
          category: '기타',
          action_items: [],
        }),
      });

      await expect(
        structureWithWorkersAI('Some input', mockEnv as unknown as Env)
      ).rejects.toThrow('Workers AI Structure: 필수 필드 누락');
    });

    it('throws error when category is missing', async () => {
      const mockEnv = createMockEnv();
      mockEnv.AI.run.mockResolvedValue({
        response: JSON.stringify({
          title: 'Title',
          summary: 'Summary',
          action_items: [],
        }),
      });

      await expect(
        structureWithWorkersAI('Some input', mockEnv as unknown as Env)
      ).rejects.toThrow('Workers AI Structure: 필수 필드 누락');
    });

    it('handles response with empty response property', async () => {
      const mockEnv = createMockEnv();
      mockEnv.AI.run.mockResolvedValue({ response: '' });

      await expect(
        structureWithWorkersAI('Some input', mockEnv as unknown as Env)
      ).rejects.toThrow('Workers AI Structure: JSON 추출 실패');
    });

    it('handles response with undefined response property', async () => {
      const mockEnv = createMockEnv();
      mockEnv.AI.run.mockResolvedValue({});

      await expect(
        structureWithWorkersAI('Some input', mockEnv as unknown as Env)
      ).rejects.toThrow('Workers AI Structure: JSON 추출 실패');
    });

    it('handles all valid categories', async () => {
      const categories = ['업무', '개발', '일기', '아이디어', '학습', '기타'];

      for (const category of categories) {
        const mockEnv = createMockEnv();
        mockEnv.AI.run.mockResolvedValue({
          response: JSON.stringify({
            title: 'Test',
            summary: 'Summary',
            category,
            action_items: [],
          }),
        });

        const result = await structureWithWorkersAI(
          'Test input',
          mockEnv as unknown as Env
        );

        expect(result.category).toBe(category);
      }
    });

    it('handles action_items with multiple items', async () => {
      const mockEnv = createMockEnv();
      mockEnv.AI.run.mockResolvedValue({
        response: JSON.stringify({
          title: 'Project Plan',
          summary: 'Planning session',
          category: '업무',
          action_items: [
            'Complete design review',
            'Schedule follow-up meeting',
            'Update documentation',
            'Send status report',
          ],
        }),
      });

      const result = await structureWithWorkersAI(
        'Test input',
        mockEnv as unknown as Env
      );

      expect(result.action_items).toHaveLength(4);
      expect(result.action_items).toContain('Complete design review');
    });

    it('handles empty action_items array', async () => {
      const mockEnv = createMockEnv();
      mockEnv.AI.run.mockResolvedValue({
        response: JSON.stringify({
          title: 'Daily Thoughts',
          summary: 'Just some random thoughts',
          category: '일기',
          action_items: [],
        }),
      });

      const result = await structureWithWorkersAI(
        'Test input',
        mockEnv as unknown as Env
      );

      expect(result.action_items).toEqual([]);
    });

    it('handles JSON with extra whitespace', async () => {
      const mockEnv = createMockEnv();
      mockEnv.AI.run.mockResolvedValue({
        response: `
          {
            "title": "Spaced JSON",
            "summary": "Has lots of whitespace",
            "category": "기타",
            "action_items": []
          }
        `,
      });

      const result = await structureWithWorkersAI(
        'Test input',
        mockEnv as unknown as Env
      );

      expect(result.title).toBe('Spaced JSON');
    });

    it('handles malformed JSON', async () => {
      const mockEnv = createMockEnv();
      mockEnv.AI.run.mockResolvedValue({
        response: '{"title": "Broken, "summary": missing quote}',
      });

      await expect(
        structureWithWorkersAI('Some input', mockEnv as unknown as Env)
      ).rejects.toThrow();
    });

    it('includes system prompt with rules about English preservation', async () => {
      const mockEnv = createMockEnv();
      mockEnv.AI.run.mockResolvedValue({
        response: JSON.stringify({
          title: 'Test',
          summary: 'Summary',
          category: '기타',
          action_items: [],
        }),
      });

      await structureWithWorkersAI('Test input', mockEnv as unknown as Env);

      const callArgs = mockEnv.AI.run.mock.calls[0][1];
      const systemMessage = callArgs.messages.find(
        (m: { role: string }) => m.role === 'system'
      );

      expect(systemMessage.content).toContain('영어');
      expect(systemMessage.content).toContain('원문');
    });

    it('handles AI service error', async () => {
      const mockEnv = createMockEnv();
      mockEnv.AI.run.mockRejectedValue(new Error('AI service unavailable'));

      await expect(
        structureWithWorkersAI('Test input', mockEnv as unknown as Env)
      ).rejects.toThrow('AI service unavailable');
    });
  });
});
