import { describe, it, expect, vi } from 'vitest';
import { embedWithWorkersAI } from './workers-ai-embed';
import type { Env } from './types';

describe('workers-ai-embed', () => {
  const createMockEnv = () => ({
    AI: {
      run: vi.fn(),
    },
  });

  describe('embedWithWorkersAI', () => {
    it('generates embedding for text successfully', async () => {
      const mockEnv = createMockEnv();
      const mockEmbedding = new Array(1024).fill(0).map((_, i) => i * 0.001);

      mockEnv.AI.run.mockResolvedValue({
        shape: [1, 1024],
        data: [mockEmbedding],
      });

      const result = await embedWithWorkersAI('테스트 텍스트입니다.', mockEnv as unknown as Env);

      expect(result).toEqual(mockEmbedding);
      expect(result).toHaveLength(1024);
    });

    it('calls AI with correct model and parameters', async () => {
      const mockEnv = createMockEnv();
      mockEnv.AI.run.mockResolvedValue({
        shape: [1, 1024],
        data: [[0.1, 0.2, 0.3]],
      });

      await embedWithWorkersAI('Hello world', mockEnv as unknown as Env);

      expect(mockEnv.AI.run).toHaveBeenCalledWith('@cf/baai/bge-m3', {
        text: ['Hello world'],
      });
    });

    it('handles Korean text', async () => {
      const mockEnv = createMockEnv();
      const mockEmbedding = new Array(1024).fill(0.5);

      mockEnv.AI.run.mockResolvedValue({
        shape: [1, 1024],
        data: [mockEmbedding],
      });

      const result = await embedWithWorkersAI(
        '한국어 텍스트를 임베딩합니다.',
        mockEnv as unknown as Env
      );

      expect(result).toHaveLength(1024);
      expect(mockEnv.AI.run).toHaveBeenCalledWith('@cf/baai/bge-m3', {
        text: ['한국어 텍스트를 임베딩합니다.'],
      });
    });

    it('handles mixed Korean and English text', async () => {
      const mockEnv = createMockEnv();
      mockEnv.AI.run.mockResolvedValue({
        shape: [1, 1024],
        data: [new Array(1024).fill(0.3)],
      });

      const result = await embedWithWorkersAI(
        'React useState hook을 사용해서 상태를 관리합니다.',
        mockEnv as unknown as Env
      );

      expect(result).toHaveLength(1024);
    });

    it('throws error when response data is missing', async () => {
      const mockEnv = createMockEnv();
      mockEnv.AI.run.mockResolvedValue({
        shape: [0],
      });

      await expect(
        embedWithWorkersAI('Test', mockEnv as unknown as Env)
      ).rejects.toThrow('Workers AI Embed: 임베딩 생성 실패');
    });

    it('throws error when response data is empty array', async () => {
      const mockEnv = createMockEnv();
      mockEnv.AI.run.mockResolvedValue({
        shape: [0],
        data: [],
      });

      await expect(
        embedWithWorkersAI('Test', mockEnv as unknown as Env)
      ).rejects.toThrow('Workers AI Embed: 임베딩 생성 실패');
    });

    it('throws error when first embedding is undefined', async () => {
      const mockEnv = createMockEnv();
      mockEnv.AI.run.mockResolvedValue({
        shape: [1, 1024],
        data: [undefined],
      });

      await expect(
        embedWithWorkersAI('Test', mockEnv as unknown as Env)
      ).rejects.toThrow('Workers AI Embed: 임베딩 생성 실패');
    });

    it('throws error when AI service fails', async () => {
      const mockEnv = createMockEnv();
      mockEnv.AI.run.mockRejectedValue(new Error('AI service unavailable'));

      await expect(
        embedWithWorkersAI('Test', mockEnv as unknown as Env)
      ).rejects.toThrow('AI service unavailable');
    });

    it('returns 1024-dimensional vector (BGE-M3 standard)', async () => {
      const mockEnv = createMockEnv();
      const mockEmbedding = new Array(1024).fill(0);

      mockEnv.AI.run.mockResolvedValue({
        shape: [1, 1024],
        data: [mockEmbedding],
      });

      const result = await embedWithWorkersAI('Test', mockEnv as unknown as Env);

      expect(result).toHaveLength(1024);
    });

    it('handles long text input', async () => {
      const mockEnv = createMockEnv();
      const longText = '테스트 '.repeat(1000);
      mockEnv.AI.run.mockResolvedValue({
        shape: [1, 1024],
        data: [new Array(1024).fill(0.1)],
      });

      const result = await embedWithWorkersAI(longText, mockEnv as unknown as Env);

      expect(result).toHaveLength(1024);
      expect(mockEnv.AI.run).toHaveBeenCalledWith('@cf/baai/bge-m3', {
        text: [longText],
      });
    });

    it('handles empty string input', async () => {
      const mockEnv = createMockEnv();
      mockEnv.AI.run.mockResolvedValue({
        shape: [1, 1024],
        data: [new Array(1024).fill(0)],
      });

      const result = await embedWithWorkersAI('', mockEnv as unknown as Env);

      expect(result).toHaveLength(1024);
    });

    it('handles special characters', async () => {
      const mockEnv = createMockEnv();
      mockEnv.AI.run.mockResolvedValue({
        shape: [1, 1024],
        data: [new Array(1024).fill(0.2)],
      });

      const result = await embedWithWorkersAI(
        '특수문자: @#$%^&*() 이모지: 🎉🚀',
        mockEnv as unknown as Env
      );

      expect(result).toHaveLength(1024);
    });
  });
});
