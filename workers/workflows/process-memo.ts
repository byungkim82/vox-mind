import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';
import type { Env, WorkflowParams, MemoCategory } from '../lib/types';
import { generatePresignedUrl } from '../lib/r2-presigned';
import { transcribeWithGroq } from '../lib/groq-stt';
import { structureWithWorkersAI } from '../lib/workers-ai-structure';
import { embedWithWorkersAI } from '../lib/workers-ai-embed';
import { workflowLogger } from '../lib/logger';

export class ProcessMemoWorkflow extends WorkflowEntrypoint<Env, WorkflowParams> {
  async run(event: WorkflowEvent<WorkflowParams>, step: WorkflowStep) {
    const { fileId, fileName, userId } = event.payload;
    workflowLogger.info('Workflow 시작', { fileId });

    // Step 1: Generate presigned URL and transcribe with Groq
    const rawText = await step.do(
      'transcribe-groq',
      {
        retries: { limit: 3, delay: '5 seconds', backoff: 'exponential' },
        timeout: '5 minutes', // Groq는 빠르므로 시간 단축
      },
      async () => {
        // Generate presigned URL for R2 object
        workflowLogger.info('Presigned URL 생성 중...', { fileId });
        const audioUrl = await generatePresignedUrl(fileName, this.env);
        workflowLogger.info('Presigned URL 생성 완료', { fileId });

        // Transcribe with Groq Whisper Large v3 Turbo
        workflowLogger.info('Groq STT 시작...', { fileId });
        const text = await transcribeWithGroq(audioUrl, this.env);
        workflowLogger.info(`Groq STT 완료: ${text.length} 글자`, { fileId });
        return text;
      }
    );

    // Step 3: Workers AI Structure
    const structure = await step.do(
      'structure',
      {
        retries: { limit: 3, delay: '3 seconds', backoff: 'exponential' },
        timeout: '5 minutes',
      },
      async () => {
        workflowLogger.info('구조화 시작...', { fileId });
        const result = await structureWithWorkersAI(rawText, this.env);
        workflowLogger.info(`구조화 완료: "${result.title}"`, { fileId });
        return result;
      }
    );

    // Step 4: Workers AI Embedding
    const embedding = await step.do(
      'embed',
      {
        retries: { limit: 3, delay: '2 seconds', backoff: 'exponential' },
        timeout: '2 minutes',
      },
      async () => {
        workflowLogger.info('임베딩 시작...', { fileId });
        const vector = await embedWithWorkersAI(structure.summary, this.env);
        workflowLogger.info(`임베딩 완료: ${vector.length}차원`, { fileId });
        return vector;
      }
    );

    // Step 5: Save to D1
    const memoId = await step.do(
      'save-d1',
      {
        retries: { limit: 3, delay: '1 second', backoff: 'linear' },
        timeout: '30 seconds',
      },
      async () => {
        const id = crypto.randomUUID();
        workflowLogger.info(`D1 저장 중: ${id}`, { fileId });
        await this.env.DB.prepare(`
          INSERT INTO memos (id, user_id, raw_text, title, summary, category, action_items, audio_file_name)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          id,
          userId,
          rawText,
          structure.title,
          structure.summary,
          structure.category,
          JSON.stringify(structure.action_items),
          fileName
        ).run();
        workflowLogger.info('D1 저장 완료', { fileId });
        return id;
      }
    );

    // Step 6: Save to Vectorize
    await step.do(
      'save-vectorize',
      {
        retries: { limit: 3, delay: '2 seconds', backoff: 'exponential' },
        timeout: '1 minute',
      },
      async () => {
        workflowLogger.info('Vectorize 저장 중...', { fileId });
        await this.env.VECTORIZE.insert([{
          id: memoId,
          values: embedding,
          metadata: { memo_id: memoId, user_id: userId },
        }]);
        workflowLogger.info('Vectorize 저장 완료', { fileId });
      }
    );

    // Note: R2 audio file is retained for playback (no cleanup step)

    workflowLogger.info('Workflow 완료', { fileId });

    return {
      memoId,
      title: structure.title,
      summary: structure.summary,
      category: structure.category as MemoCategory,
      actionItems: structure.action_items,
    };
  }
}
