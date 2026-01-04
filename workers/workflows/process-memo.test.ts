import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock cloudflare:workers
vi.mock('cloudflare:workers', () => ({
  WorkflowEntrypoint: class {
    env: any;
    constructor(ctx: any, env: any) {
      this.env = env;
    }
  },
  WorkflowStep: class {},
  WorkflowEvent: class {},
}));

// Mock dependencies
vi.mock('../lib/r2-presigned', () => ({
  generatePresignedUrl: vi.fn().mockResolvedValue('https://r2.example.com/presigned-url'),
}));

vi.mock('../lib/groq-stt', () => ({
  transcribeWithGroq: vi.fn().mockResolvedValue('전사된 텍스트입니다.'),
}));

vi.mock('../lib/workers-ai-structure', () => ({
  structureWithWorkersAI: vi.fn().mockResolvedValue({
    title: '테스트 메모',
    summary: '테스트 요약입니다.',
    category: '개발',
    action_items: ['할 일 1', '할 일 2'],
  }),
}));

vi.mock('../lib/workers-ai-embed', () => ({
  embedWithWorkersAI: vi.fn().mockResolvedValue(new Array(1024).fill(0.1)),
}));

vi.mock('../lib/logger', () => ({
  workflowLogger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { ProcessMemoWorkflow } from './process-memo';
import { generatePresignedUrl } from '../lib/r2-presigned';
import { transcribeWithGroq } from '../lib/groq-stt';
import { structureWithWorkersAI } from '../lib/workers-ai-structure';
import { embedWithWorkersAI } from '../lib/workers-ai-embed';
import type { Env, WorkflowParams } from '../lib/types';

describe('ProcessMemoWorkflow', () => {
  const createMockEnv = (): Partial<Env> => ({
    DB: {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      run: vi.fn().mockResolvedValue({}),
    } as any,
    VECTORIZE: {
      insert: vi.fn().mockResolvedValue({}),
    } as any,
  });

  const createMockStep = () => {
    const stepResults: Record<string, any> = {};
    return {
      do: vi.fn().mockImplementation(async (name: string, _options: any, fn: () => Promise<any>) => {
        const result = await fn();
        stepResults[name] = result;
        return result;
      }),
      getResults: () => stepResults,
    };
  };

  const createMockEvent = (params: WorkflowParams) => ({
    payload: params,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('run', () => {
    it('completes all workflow steps successfully', async () => {
      const mockEnv = createMockEnv();
      const mockStep = createMockStep();
      const mockEvent = createMockEvent({
        fileId: 'file-123',
        fileName: 'recording.webm',
        userId: 'user-456',
      });

      const workflow = new ProcessMemoWorkflow({} as any, mockEnv as Env);
      const result = await workflow.run(mockEvent as any, mockStep as any);

      expect(result).toMatchObject({
        memoId: expect.any(String),
        title: '테스트 메모',
        summary: '테스트 요약입니다.',
        category: '개발',
        actionItems: ['할 일 1', '할 일 2'],
      });
    });

    it('calls step.do for each workflow step', async () => {
      const mockEnv = createMockEnv();
      const mockStep = createMockStep();
      const mockEvent = createMockEvent({
        fileId: 'file-123',
        fileName: 'recording.webm',
        userId: 'user-456',
      });

      const workflow = new ProcessMemoWorkflow({} as any, mockEnv as Env);
      await workflow.run(mockEvent as any, mockStep as any);

      const stepNames = mockStep.do.mock.calls.map((call) => call[0]);
      expect(stepNames).toContain('transcribe-groq');
      expect(stepNames).toContain('structure');
      expect(stepNames).toContain('embed');
      expect(stepNames).toContain('save-d1');
      expect(stepNames).toContain('save-vectorize');
    });

    it('generates presigned URL for audio file', async () => {
      const mockEnv = createMockEnv();
      const mockStep = createMockStep();
      const mockEvent = createMockEvent({
        fileId: 'file-123',
        fileName: 'recording.webm',
        userId: 'user-456',
      });

      const workflow = new ProcessMemoWorkflow({} as any, mockEnv as Env);
      await workflow.run(mockEvent as any, mockStep as any);

      expect(generatePresignedUrl).toHaveBeenCalledWith('recording.webm', mockEnv);
    });

    it('transcribes audio using Groq', async () => {
      const mockEnv = createMockEnv();
      const mockStep = createMockStep();
      const mockEvent = createMockEvent({
        fileId: 'file-123',
        fileName: 'recording.webm',
        userId: 'user-456',
      });

      const workflow = new ProcessMemoWorkflow({} as any, mockEnv as Env);
      await workflow.run(mockEvent as any, mockStep as any);

      expect(transcribeWithGroq).toHaveBeenCalledWith(
        'https://r2.example.com/presigned-url',
        mockEnv
      );
    });

    it('structures transcription using Workers AI', async () => {
      const mockEnv = createMockEnv();
      const mockStep = createMockStep();
      const mockEvent = createMockEvent({
        fileId: 'file-123',
        fileName: 'recording.webm',
        userId: 'user-456',
      });

      const workflow = new ProcessMemoWorkflow({} as any, mockEnv as Env);
      await workflow.run(mockEvent as any, mockStep as any);

      expect(structureWithWorkersAI).toHaveBeenCalledWith('전사된 텍스트입니다.', mockEnv);
    });

    it('generates embedding from summary', async () => {
      const mockEnv = createMockEnv();
      const mockStep = createMockStep();
      const mockEvent = createMockEvent({
        fileId: 'file-123',
        fileName: 'recording.webm',
        userId: 'user-456',
      });

      const workflow = new ProcessMemoWorkflow({} as any, mockEnv as Env);
      await workflow.run(mockEvent as any, mockStep as any);

      expect(embedWithWorkersAI).toHaveBeenCalledWith('테스트 요약입니다.', mockEnv);
    });

    it('saves memo to D1 with correct data', async () => {
      const mockEnv = createMockEnv();
      const mockStep = createMockStep();
      const mockEvent = createMockEvent({
        fileId: 'file-123',
        fileName: 'recording.webm',
        userId: 'user-456',
      });

      const workflow = new ProcessMemoWorkflow({} as any, mockEnv as Env);
      await workflow.run(mockEvent as any, mockStep as any);

      expect(mockEnv.DB!.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO memos')
      );
      expect(mockEnv.DB!.bind).toHaveBeenCalledWith(
        expect.any(String), // id
        'user-456', // userId
        '전사된 텍스트입니다.', // rawText
        '테스트 메모', // title
        '테스트 요약입니다.', // summary
        '개발', // category
        JSON.stringify(['할 일 1', '할 일 2']), // action_items
        'recording.webm' // fileName
      );
    });

    it('saves vector to Vectorize with metadata', async () => {
      const mockEnv = createMockEnv();
      const mockStep = createMockStep();
      const mockEvent = createMockEvent({
        fileId: 'file-123',
        fileName: 'recording.webm',
        userId: 'user-456',
      });

      const workflow = new ProcessMemoWorkflow({} as any, mockEnv as Env);
      const result = await workflow.run(mockEvent as any, mockStep as any);

      expect(mockEnv.VECTORIZE!.insert).toHaveBeenCalledWith([
        {
          id: result.memoId,
          values: expect.any(Array),
          metadata: {
            memo_id: result.memoId,
            user_id: 'user-456',
          },
        },
      ]);
    });

    it('configures step retry options correctly', async () => {
      const mockEnv = createMockEnv();
      const mockStep = createMockStep();
      const mockEvent = createMockEvent({
        fileId: 'file-123',
        fileName: 'recording.webm',
        userId: 'user-456',
      });

      const workflow = new ProcessMemoWorkflow({} as any, mockEnv as Env);
      await workflow.run(mockEvent as any, mockStep as any);

      // Check transcribe-groq step options
      const transcribeCall = mockStep.do.mock.calls.find(
        (call) => call[0] === 'transcribe-groq'
      );
      expect(transcribeCall[1]).toMatchObject({
        retries: { limit: 3, delay: '5 seconds', backoff: 'exponential' },
        timeout: '5 minutes',
      });

      // Check structure step options
      const structureCall = mockStep.do.mock.calls.find(
        (call) => call[0] === 'structure'
      );
      expect(structureCall[1]).toMatchObject({
        retries: { limit: 3, delay: '3 seconds', backoff: 'exponential' },
        timeout: '5 minutes',
      });

      // Check embed step options
      const embedCall = mockStep.do.mock.calls.find(
        (call) => call[0] === 'embed'
      );
      expect(embedCall[1]).toMatchObject({
        retries: { limit: 3, delay: '2 seconds', backoff: 'exponential' },
        timeout: '2 minutes',
      });

      // Check save-d1 step options
      const saveD1Call = mockStep.do.mock.calls.find(
        (call) => call[0] === 'save-d1'
      );
      expect(saveD1Call[1]).toMatchObject({
        retries: { limit: 3, delay: '1 second', backoff: 'linear' },
        timeout: '30 seconds',
      });

      // Check save-vectorize step options
      const saveVectorizeCall = mockStep.do.mock.calls.find(
        (call) => call[0] === 'save-vectorize'
      );
      expect(saveVectorizeCall[1]).toMatchObject({
        retries: { limit: 3, delay: '2 seconds', backoff: 'exponential' },
        timeout: '1 minute',
      });
    });

    it('propagates transcription error', async () => {
      vi.mocked(transcribeWithGroq).mockRejectedValueOnce(
        new Error('Groq STT 실패: Invalid audio')
      );

      const mockEnv = createMockEnv();
      const mockStep = {
        do: vi.fn().mockImplementation(async (_name: string, _options: any, fn: () => Promise<any>) => {
          return await fn();
        }),
      };
      const mockEvent = createMockEvent({
        fileId: 'file-123',
        fileName: 'recording.webm',
        userId: 'user-456',
      });

      const workflow = new ProcessMemoWorkflow({} as any, mockEnv as Env);

      await expect(workflow.run(mockEvent as any, mockStep as any)).rejects.toThrow(
        'Groq STT 실패: Invalid audio'
      );
    });

    it('propagates structure error', async () => {
      vi.mocked(structureWithWorkersAI).mockRejectedValueOnce(
        new Error('Workers AI Structure: JSON 추출 실패')
      );

      const mockEnv = createMockEnv();
      const mockStep = {
        do: vi.fn().mockImplementation(async (_name: string, _options: any, fn: () => Promise<any>) => {
          return await fn();
        }),
      };
      const mockEvent = createMockEvent({
        fileId: 'file-123',
        fileName: 'recording.webm',
        userId: 'user-456',
      });

      const workflow = new ProcessMemoWorkflow({} as any, mockEnv as Env);

      await expect(workflow.run(mockEvent as any, mockStep as any)).rejects.toThrow(
        'Workers AI Structure: JSON 추출 실패'
      );
    });

    it('propagates database error', async () => {
      const mockEnv = createMockEnv();
      (mockEnv.DB!.run as any).mockRejectedValueOnce(new Error('D1 error'));

      const mockStep = {
        do: vi.fn().mockImplementation(async (_name: string, _options: any, fn: () => Promise<any>) => {
          return await fn();
        }),
      };
      const mockEvent = createMockEvent({
        fileId: 'file-123',
        fileName: 'recording.webm',
        userId: 'user-456',
      });

      const workflow = new ProcessMemoWorkflow({} as any, mockEnv as Env);

      await expect(workflow.run(mockEvent as any, mockStep as any)).rejects.toThrow(
        'D1 error'
      );
    });

    it('returns correct result structure', async () => {
      const mockEnv = createMockEnv();
      const mockStep = createMockStep();
      const mockEvent = createMockEvent({
        fileId: 'file-123',
        fileName: 'recording.webm',
        userId: 'user-456',
      });

      const workflow = new ProcessMemoWorkflow({} as any, mockEnv as Env);
      const result = await workflow.run(mockEvent as any, mockStep as any);

      expect(result).toHaveProperty('memoId');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('category');
      expect(result).toHaveProperty('actionItems');
      expect(typeof result.memoId).toBe('string');
      expect(result.memoId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });
  });
});
