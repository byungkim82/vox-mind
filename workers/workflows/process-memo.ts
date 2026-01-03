import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';
import type { Env, WorkflowParams, MemoCategory } from '../lib/types';
import { transcribeWithWorkersAI } from '../lib/workers-ai-stt';
import { structureWithWorkersAI } from '../lib/workers-ai-structure';
import { embedWithWorkersAI } from '../lib/workers-ai-embed';

export class ProcessMemoWorkflow extends WorkflowEntrypoint<Env, WorkflowParams> {
  async run(event: WorkflowEvent<WorkflowParams>, step: WorkflowStep) {
    const { fileId, fileName, userId } = event.payload;
    console.log(`[${fileId}] Workflow 시작`);

    // Step 1: Fetch audio from R2 and transcribe with Workers AI STT
    // Combined into one step to avoid ArrayBuffer serialization issues
    const rawText = await step.do(
      'fetch-and-transcribe',
      {
        retries: { limit: 3, delay: '5 seconds', backoff: 'exponential' },
        timeout: '10 minutes',
      },
      async () => {
        // Fetch from R2
        console.log(`[${fileId}] R2에서 파일 가져오는 중...`);
        const file = await this.env.AUDIO_BUCKET.get(fileName);
        if (!file) {
          throw new Error(`파일 없음: ${fileName}`);
        }
        const audioBuffer = await file.arrayBuffer();
        console.log(`[${fileId}] R2 파일 크기: ${audioBuffer.byteLength} bytes`);

        // Transcribe with Workers AI
        console.log(`[${fileId}] STT 시작...`);
        const text = await transcribeWithWorkersAI(audioBuffer, this.env);
        console.log(`[${fileId}] STT 완료: ${text.length} 글자`);
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
        console.log(`[${fileId}] 구조화 시작...`);
        const result = await structureWithWorkersAI(rawText, this.env);
        console.log(`[${fileId}] 구조화 완료: "${result.title}"`);
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
        console.log(`[${fileId}] 임베딩 시작...`);
        const vector = await embedWithWorkersAI(structure.summary, this.env);
        console.log(`[${fileId}] 임베딩 완료: ${vector.length}차원`);
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
        console.log(`[${fileId}] D1 저장 중: ${id}`);
        await this.env.DB.prepare(`
          INSERT INTO memos (id, user_id, raw_text, title, summary, category, action_items)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
          id,
          userId,
          rawText,
          structure.title,
          structure.summary,
          structure.category,
          JSON.stringify(structure.action_items)
        ).run();
        console.log(`[${fileId}] D1 저장 완료`);
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
        console.log(`[${fileId}] Vectorize 저장 중...`);
        await this.env.VECTORIZE.insert([{
          id: memoId,
          values: embedding,
          metadata: { memo_id: memoId, user_id: userId },
        }]);
        console.log(`[${fileId}] Vectorize 저장 완료`);
      }
    );

    // Step 7: Cleanup R2
    await step.do(
      'cleanup',
      {
        retries: { limit: 2, delay: '1 second', backoff: 'constant' },
        timeout: '30 seconds',
      },
      async () => {
        console.log(`[${fileId}] R2 파일 삭제 중...`);
        await this.env.AUDIO_BUCKET.delete(fileName);
        console.log(`[${fileId}] R2 파일 삭제 완료`);
      }
    );

    console.log(`[${fileId}] Workflow 완료`);

    return {
      memoId,
      title: structure.title,
      summary: structure.summary,
      category: structure.category as MemoCategory,
      actionItems: structure.action_items,
    };
  }
}
