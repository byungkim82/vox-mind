# Vox Mind: Cloudflare Native AI 마이그레이션 체크리스트

> **목적**: 외부 LLM API(Groq, Gemini, Voyage)를 Cloudflare Workers AI + Workflows로 전환
> **예상 소요**: 4-6일
> **마지막 업데이트**: 2026-01-02

---

## 변경 매핑 요약

| 기능 | 현재 | 변경 후 |
|------|------|---------|
| STT | Groq `whisper-large-v3-turbo` | `@cf/openai/whisper-large-v3-turbo` |
| 구조화 | Gemini 2.0 Flash | `@cf/meta/llama-4-scout-17b-16e-instruct` |
| 임베딩 | Voyage 3.5-lite (512d) | `@cf/baai/bge-m3` (1024d) |
| 오케스트레이션 | 순차 API 호출 | Cloudflare Workflows |
| Vectorize | `vox-mind-embeddings` (512d) | `vox-mind-embeddings-v2` (1024d) |

---

# 상세 체크리스트

## Phase 1: 인프라 설정
> 예상 소요: 2-3시간

### 1.1 새 Vectorize 인덱스 생성
- [ ] **터미널에서 실행**:
  ```bash
  wrangler vectorize create vox-mind-embeddings-v2 --dimensions=1024 --metric=cosine
  ```
- [ ] 생성 확인:
  ```bash
  wrangler vectorize list
  ```
- [ ] 인덱스 ID 기록: `__________________`

### 1.2 wrangler.toml 업데이트
**파일**: `wrangler.toml`

- [ ] Workers AI 바인딩 추가 (파일 하단):
  ```toml
  # Workers AI
  [ai]
  binding = "AI"
  ```

- [ ] Workflows 바인딩 추가:
  ```toml
  # Workflows
  [[workflows]]
  name = "vox-mind-process"
  binding = "PROCESS_WORKFLOW"
  class_name = "ProcessMemoWorkflow"
  ```

- [ ] 새 Vectorize 인덱스 바인딩 추가 (기존 것 유지):
  ```toml
  # 새 Vectorize (1024d) - 마이그레이션용
  [[vectorize]]
  binding = "VECTORIZE_NEW"
  index_name = "vox-mind-embeddings-v2"
  ```

- [ ] production 환경에도 동일하게 추가:
  ```toml
  [env.production.ai]
  binding = "AI"

  [[env.production.workflows]]
  name = "vox-mind-process"
  binding = "PROCESS_WORKFLOW"
  class_name = "ProcessMemoWorkflow"

  [[env.production.vectorize]]
  binding = "VECTORIZE_NEW"
  index_name = "vox-mind-embeddings-v2"
  ```

### 1.3 타입 정의 업데이트
**파일**: `workers/lib/types.ts`

- [ ] Env 인터페이스에 추가:
  ```typescript
  // Workers AI
  AI: Ai;

  // Workflows
  PROCESS_WORKFLOW: Workflow;

  // 새 Vectorize (마이그레이션 기간)
  VECTORIZE_NEW: VectorizeIndex;
  ```

- [ ] Workers AI 응답 타입 추가:
  ```typescript
  // Workers AI Whisper 응답
  export interface WhisperResponse {
    text: string;
    word_count?: number;
    words?: Array<{ word: string; start: number; end: number }>;
    vtt?: string;
  }

  // Workers AI BGE-M3 응답
  export interface BGEEmbeddingResponse {
    shape: number[];
    data: number[][];
  }

  // Workflow 파라미터
  export interface WorkflowParams {
    fileId: string;
    fileName: string;
    userId: string;
  }

  // Workflow 결과
  export interface WorkflowResult {
    memoId: string;
    title: string;
    summary: string;
    category: MemoCategory;
    actionItems: string[];
  }
  ```

- [ ] 글로벌 Ai 타입 선언 추가:
  ```typescript
  declare global {
    interface Ai {
      run<T>(model: string, inputs: Record<string, unknown>): Promise<T>;
    }
  }
  ```

### 1.4 로컬 테스트 확인
- [ ] 로컬 Workers 실행 테스트:
  ```bash
  npm run dev:worker
  ```
- [ ] 타입 체크 통과 확인:
  ```bash
  npm run typecheck
  ```

---

## Phase 2: Workers AI 클라이언트 구현
> 예상 소요: 3-4시간

### 2.1 STT 클라이언트 생성
**파일**: `workers/lib/workers-ai-stt.ts` (신규 생성)

- [ ] 파일 생성 및 구현:
  ```typescript
  import type { Env, WhisperResponse } from './types';

  export async function transcribeWithWorkersAI(
    audioBuffer: ArrayBuffer,
    env: Env
  ): Promise<string> {
    // ArrayBuffer를 Uint8Array로 변환 후 배열로
    const audioArray = Array.from(new Uint8Array(audioBuffer));

    const response = await env.AI.run<WhisperResponse>(
      '@cf/openai/whisper-large-v3-turbo',
      { audio: audioArray }
    );

    if (!response.text) {
      throw new Error('Workers AI STT: 전사 텍스트 없음');
    }

    return response.text;
  }
  ```

- [ ] 기존 groq-client.ts와 출력 형식 비교 테스트

### 2.2 구조화 클라이언트 생성
**파일**: `workers/lib/workers-ai-structure.ts` (신규 생성)

- [ ] 파일 생성 및 구현:
  ```typescript
  import type { Env, MemoStructure } from './types';

  const SYSTEM_PROMPT = `당신은 음성 메모를 분석하는 AI 어시스턴트입니다.
  사용자가 녹음한 내용에서 핵심 정보를 추출하세요.

  중요 규칙:
  1. 한국어 문맥 속의 영어 단어나 기술 용어는 번역하지 말고 원문 그대로 유지하세요.
     예: "useState hook" → "useState hook" (O), "사용상태 후크" (X)
  2. 횡설수설하거나 반복된 내용이 있어도 핵심만 추출하세요.
  3. 액션 아이템은 명시적으로 언급된 것만 포함하세요.

  다음 JSON 형식으로만 응답하세요:
  {
    "title": "한 줄 제목 (20자 이내)",
    "summary": "핵심 요약 (2-3문장)",
    "category": "업무|개발|일기|아이디어|학습|기타 중 하나",
    "action_items": ["할 일 1", "할 일 2"]
  }`;

  interface LlamaResponse {
    response?: string;
  }

  export async function structureWithWorkersAI(
    rawText: string,
    env: Env
  ): Promise<MemoStructure> {
    const response = await env.AI.run<LlamaResponse>(
      '@cf/meta/llama-4-scout-17b-16e-instruct',
      {
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `다음 음성 메모를 분석해주세요:\n\n${rawText}` }
        ],
        max_tokens: 500,
        temperature: 0.3,
      }
    );

    const text = response.response || '';

    // JSON 추출 (마크다운 코드블록 또는 직접 JSON)
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) ||
      text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Workers AI Structure: JSON 추출 실패');
    }

    const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]) as MemoStructure;

    if (!parsed.title || !parsed.summary || !parsed.category) {
      throw new Error('Workers AI Structure: 필수 필드 누락');
    }

    return parsed;
  }
  ```

- [ ] 시스템 프롬프트가 gemini-client.ts와 동일한지 확인
- [ ] 테스트 텍스트로 출력 품질 검증

### 2.3 임베딩 클라이언트 생성
**파일**: `workers/lib/workers-ai-embed.ts` (신규 생성)

- [ ] 파일 생성 및 구현:
  ```typescript
  import type { Env, BGEEmbeddingResponse } from './types';

  export async function embedWithWorkersAI(
    text: string,
    env: Env
  ): Promise<number[]> {
    const response = await env.AI.run<BGEEmbeddingResponse>(
      '@cf/baai/bge-m3',
      { text: [text] }
    );

    if (!response.data || !response.data[0]) {
      throw new Error('Workers AI Embed: 임베딩 생성 실패');
    }

    // BGE-M3는 1024차원 벡터 반환
    return response.data[0];
  }
  ```

- [ ] 반환 벡터 차원이 1024인지 확인

### 2.4 클라이언트 통합 테스트
- [ ] 세 클라이언트 모두 import 가능 확인
- [ ] 타입 체크 통과:
  ```bash
  npm run typecheck
  ```

---

## Phase 3: Workflow 구현
> 예상 소요: 4-5시간

### 3.1 Workflow 디렉토리 생성
- [ ] 디렉토리 생성:
  ```bash
  mkdir -p workers/workflows
  ```

### 3.2 Workflow 클래스 구현
**파일**: `workers/workflows/process-memo.ts` (신규 생성)

- [ ] 파일 생성 및 전체 구현:
  ```typescript
  import {
    WorkflowEntrypoint,
    WorkflowStep,
    WorkflowEvent
  } from 'cloudflare:workers';
  import type { Env, WorkflowParams, MemoStructure } from '../lib/types';
  import { transcribeWithWorkersAI } from '../lib/workers-ai-stt';
  import { structureWithWorkersAI } from '../lib/workers-ai-structure';
  import { embedWithWorkersAI } from '../lib/workers-ai-embed';

  export class ProcessMemoWorkflow extends WorkflowEntrypoint<Env, WorkflowParams> {
    async run(event: WorkflowEvent<WorkflowParams>, step: WorkflowStep) {
      const { fileId, fileName, userId } = event.payload;
      console.log(`[${fileId}] Workflow 시작`);

      // Step 1: R2에서 오디오 가져오기
      const audioBuffer = await step.do(
        'fetch-audio',
        {
          retries: { limit: 3, delay: '2 seconds', backoff: 'exponential' },
          timeout: '2 minutes',
        },
        async () => {
          console.log(`[${fileId}] R2에서 파일 가져오는 중...`);
          const file = await this.env.AUDIO_BUCKET.get(fileName);
          if (!file) {
            throw new Error(`파일 없음: ${fileName}`);
          }
          const buffer = await file.arrayBuffer();
          console.log(`[${fileId}] R2 파일 크기: ${buffer.byteLength} bytes`);
          return buffer;
        }
      );

      // Step 2: Workers AI STT
      const rawText = await step.do(
        'transcribe',
        {
          retries: { limit: 3, delay: '5 seconds', backoff: 'exponential' },
          timeout: '10 minutes',
        },
        async () => {
          console.log(`[${fileId}] STT 시작...`);
          const text = await transcribeWithWorkersAI(audioBuffer, this.env);
          console.log(`[${fileId}] STT 완료: ${text.length} 글자`);
          return text;
        }
      );

      // Step 3: Workers AI 구조화
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

      // Step 4: Workers AI 임베딩
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

      // Step 5: D1 저장
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

      // Step 6: Vectorize 저장 (새 인덱스 사용)
      await step.do(
        'save-vectorize',
        {
          retries: { limit: 3, delay: '2 seconds', backoff: 'exponential' },
          timeout: '1 minute',
        },
        async () => {
          console.log(`[${fileId}] Vectorize 저장 중...`);
          await this.env.VECTORIZE_NEW.insert([{
            id: memoId,
            values: embedding,
            metadata: { memo_id: memoId, user_id: userId }
          }]);
          console.log(`[${fileId}] Vectorize 저장 완료`);
        }
      );

      // Step 7: R2 정리
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
        category: structure.category,
        actionItems: structure.action_items,
      };
    }
  }
  ```

### 3.3 Workflow Export 추가
**파일**: `workers/api.ts`

- [ ] 파일 상단에 export 추가:
  ```typescript
  // Workflow export (wrangler가 인식하도록)
  export { ProcessMemoWorkflow } from './workflows/process-memo';
  ```

### 3.4 Workflow 컴파일 테스트
- [ ] 타입 체크:
  ```bash
  npm run typecheck
  ```
- [ ] 빌드 테스트:
  ```bash
  npm run build
  ```

---

## Phase 4: API 엔드포인트 리팩토링
> 예상 소요: 2-3시간

### 4.1 POST /api/process 수정
**파일**: `workers/api.ts`

- [ ] 기존 동기 처리 로직 백업 (주석 처리 또는 별도 함수로)

- [ ] 새로운 비동기 처리로 교체:
  ```typescript
  // POST /api/process - Workflow 트리거
  app.post('/api/process', authMiddleware, async (c) => {
    try {
      const { fileId, fileName } = await c.req.json();

      if (!fileId || !fileName) {
        return c.json({ error: 'fileId와 fileName 필수' }, 400);
      }

      const auth = getAuth(c);
      console.log(`[${fileId}] Workflow 생성 중...`);

      // Workflow 인스턴스 생성
      const instance = await c.env.PROCESS_WORKFLOW.create({
        params: {
          fileId,
          fileName,
          userId: auth.userId,
        }
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
  ```

### 4.2 GET /api/process/:instanceId 추가
**파일**: `workers/api.ts`

- [ ] 상태 조회 엔드포인트 추가:
  ```typescript
  // GET /api/process/:instanceId - Workflow 상태 조회
  app.get('/api/process/:instanceId', authMiddleware, async (c) => {
    try {
      const instanceId = c.req.param('instanceId');

      const instance = await c.env.PROCESS_WORKFLOW.get(instanceId);
      const status = await instance.status();

      return c.json({
        instanceId,
        status: status.status,  // 'queued' | 'running' | 'paused' | 'errored' | 'complete' | 'terminated'
        output: status.output,  // WorkflowResult (complete 시)
        error: status.error,    // 에러 메시지 (errored 시)
      });

    } catch (error) {
      console.error('Status check error:', error);
      return c.json({
        error: '상태 확인 실패',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 500);
    }
  });
  ```

### 4.3 응답 타입 정의 추가
**파일**: `workers/lib/types.ts`

- [ ] API 응답 타입 추가:
  ```typescript
  // POST /api/process 응답
  export interface ProcessStartResponse {
    instanceId: string;
    status: 'queued';
    message: string;
  }

  // GET /api/process/:instanceId 응답
  export interface ProcessStatusResponse {
    instanceId: string;
    status: 'queued' | 'running' | 'paused' | 'errored' | 'complete' | 'terminated';
    output?: WorkflowResult;
    error?: string;
  }
  ```

### 4.4 로컬 테스트
- [ ] Workers 로컬 실행:
  ```bash
  npm run dev:worker
  ```
- [ ] curl로 엔드포인트 테스트 (업로드 → 처리 시작 → 상태 조회)

---

## Phase 5: 프론트엔드 업데이트
> 예상 소요: 2-3시간

### 5.1 API 클라이언트 타입 추가
**파일**: `lib/api/client.ts`

- [ ] 새 타입 정의 추가:
  ```typescript
  export interface ProcessStartResponse {
    instanceId: string;
    status: 'queued' | 'running';
    message: string;
  }

  export interface ProcessStatusResponse {
    instanceId: string;
    status: 'queued' | 'running' | 'paused' | 'errored' | 'complete' | 'terminated';
    output?: ProcessResponse;
    error?: string;
  }
  ```

### 5.2 API 클라이언트 함수 추가
**파일**: `lib/api/client.ts`

- [ ] 처리 시작 함수:
  ```typescript
  export async function startProcessing(
    fileId: string,
    fileName: string
  ): Promise<ProcessStartResponse> {
    const response = await fetch(`${API_BASE}/api/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId, fileName }),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '처리 시작 실패');
    }

    return response.json();
  }
  ```

- [ ] 상태 조회 함수:
  ```typescript
  export async function checkProcessingStatus(
    instanceId: string
  ): Promise<ProcessStatusResponse> {
    const response = await fetch(`${API_BASE}/api/process/${instanceId}`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '상태 확인 실패');
    }

    return response.json();
  }
  ```

- [ ] 비동기 처리 + 폴링 함수:
  ```typescript
  const POLL_INTERVAL = 2000; // 2초
  const MAX_POLL_ATTEMPTS = 150; // 최대 5분

  export async function processAudioAsync(
    fileId: string,
    fileName: string
  ): Promise<ProcessResponse> {
    // 처리 시작
    const { instanceId } = await startProcessing(fileId, fileName);

    // 폴링으로 완료 대기
    let attempts = 0;
    while (attempts < MAX_POLL_ATTEMPTS) {
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));

      const status = await checkProcessingStatus(instanceId);

      if (status.status === 'complete' && status.output) {
        return status.output;
      }

      if (status.status === 'errored' || status.status === 'terminated') {
        throw new Error(status.error || '처리 실패');
      }

      attempts++;
    }

    throw new Error('처리 시간 초과');
  }
  ```

### 5.3 기존 processAudio 함수 교체
**파일**: `lib/api/client.ts`

- [ ] 기존 `processAudio` 함수를 `processAudioAsync`로 교체 또는 리다이렉트:
  ```typescript
  // 기존 함수명 유지하려면:
  export const processAudio = processAudioAsync;
  ```

### 5.4 Recorder 컴포넌트 수정
**파일**: `components/Recorder/Recorder.tsx`

- [ ] import 변경 (필요시):
  ```typescript
  import { uploadAudio, processAudio } from '@/lib/api/client';
  ```

- [ ] processRecording 함수는 기존 로직 유지 (processAudio가 동일 시그니처)

### 5.5 프론트엔드 테스트
- [ ] 프론트엔드 개발 서버 실행:
  ```bash
  npm run dev
  ```
- [ ] 녹음 → 업로드 → 처리 → 결과 표시 E2E 테스트

---

## Phase 6: 데이터 마이그레이션
> 예상 소요: 3-4시간

### 6.1 마이그레이션 스크립트 생성
**파일**: `scripts/migrate-embeddings.ts` (신규 생성)

- [ ] 디렉토리 생성:
  ```bash
  mkdir -p scripts
  ```

- [ ] 마이그레이션 스크립트 작성:
  ```typescript
  // scripts/migrate-embeddings.ts
  // Cloudflare Workers에서 실행할 마이그레이션 Worker

  import type { Env, BGEEmbeddingResponse } from '../workers/lib/types';

  interface MemoRow {
    id: string;
    user_id: string;
    summary: string;
  }

  export default {
    async fetch(request: Request, env: Env): Promise<Response> {
      const BATCH_SIZE = 50;
      let offset = 0;
      let totalMigrated = 0;
      let hasMore = true;

      try {
        while (hasMore) {
          // 배치로 메모 조회
          const { results } = await env.DB.prepare(`
            SELECT id, user_id, summary FROM memos
            WHERE summary IS NOT NULL AND summary != ''
            ORDER BY created_at ASC
            LIMIT ? OFFSET ?
          `).bind(BATCH_SIZE, offset).all<MemoRow>();

          if (results.length === 0) {
            hasMore = false;
            break;
          }

          // BGE-M3로 임베딩 생성 (배치)
          const texts = results.map(m => m.summary);
          const response = await env.AI.run<BGEEmbeddingResponse>(
            '@cf/baai/bge-m3',
            { text: texts }
          );

          // 새 Vectorize 인덱스에 삽입
          const vectors = results.map((memo, i) => ({
            id: memo.id,
            values: response.data[i],
            metadata: { memo_id: memo.id, user_id: memo.user_id }
          }));

          await env.VECTORIZE_NEW.insert(vectors);

          totalMigrated += results.length;
          console.log(`마이그레이션 진행: ${totalMigrated}개 완료`);

          offset += BATCH_SIZE;

          // Rate limiting 방지
          await new Promise(r => setTimeout(r, 500));
        }

        return new Response(JSON.stringify({
          success: true,
          totalMigrated,
          message: '마이그레이션 완료'
        }), {
          headers: { 'Content-Type': 'application/json' }
        });

      } catch (error) {
        console.error('마이그레이션 에러:', error);
        return new Response(JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          migratedBeforeError: totalMigrated
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
  };
  ```

### 6.2 마이그레이션 Worker 설정
**파일**: `wrangler.toml` (임시 추가)

- [ ] 마이그레이션 Worker 설정 추가:
  ```toml
  # 마이그레이션 Worker (완료 후 제거)
  [env.migration]
  name = "vox-mind-migration"
  main = "scripts/migrate-embeddings.ts"

  [env.migration.ai]
  binding = "AI"

  [[env.migration.d1_databases]]
  binding = "DB"
  database_name = "vox-mind-db"
  database_id = "4d4a4eb0-45d3-4446-af7e-307416a93c9d"

  [[env.migration.vectorize]]
  binding = "VECTORIZE_NEW"
  index_name = "vox-mind-embeddings-v2"
  ```

### 6.3 마이그레이션 실행
- [ ] 마이그레이션 Worker 배포:
  ```bash
  wrangler deploy --env migration
  ```
- [ ] 마이그레이션 실행:
  ```bash
  curl https://vox-mind-migration.byungkim82.workers.dev/
  ```
- [ ] 결과 확인 및 로그 체크

### 6.4 마이그레이션 검증
- [ ] 구/신 인덱스 벡터 수 비교:
  ```bash
  wrangler vectorize info vox-mind-embeddings
  wrangler vectorize info vox-mind-embeddings-v2
  ```
- [ ] 샘플 검색 테스트

### 6.5 인덱스 전환
**파일**: `wrangler.toml`

- [ ] 바인딩 이름 교체:
  ```toml
  # 이전: VECTORIZE_NEW → 이후: VECTORIZE
  [[vectorize]]
  binding = "VECTORIZE"
  index_name = "vox-mind-embeddings-v2"
  ```

- [ ] types.ts에서 VECTORIZE_NEW 제거

- [ ] Workflow에서 VECTORIZE_NEW → VECTORIZE로 변경

### 6.6 마이그레이션 정리
- [ ] 마이그레이션 Worker 삭제:
  ```bash
  wrangler delete --env migration
  ```
- [ ] wrangler.toml에서 [env.migration] 섹션 제거

---

## Phase 7: 레거시 정리 및 배포
> 예상 소요: 2-3시간

### 7.1 레거시 파일 삭제
- [ ] 외부 API 클라이언트 삭제:
  ```bash
  rm workers/lib/groq-client.ts
  rm workers/lib/gemini-client.ts
  rm workers/lib/voyage-client.ts
  ```

- [ ] types.ts에서 레거시 API 키 타입 제거:
  ```typescript
  // 삭제:
  GROQ_API_KEY?: string;
  GEMINI_API_KEY?: string;
  VOYAGE_API_KEY?: string;
  ```

### 7.2 시크릿 삭제
- [ ] 프로덕션 시크릿 삭제:
  ```bash
  wrangler secret delete GROQ_API_KEY
  wrangler secret delete GEMINI_API_KEY
  wrangler secret delete VOYAGE_API_KEY
  ```

### 7.3 GitHub Actions 업데이트
**파일**: `.github/workflows/deploy.yml`

- [ ] setup-secrets 단계에서 외부 API 키 설정 제거:
  ```yaml
  # 삭제할 부분:
  - name: Set GROQ_API_KEY
    run: echo "${{ secrets.GROQ_API_KEY }}" | wrangler secret put GROQ_API_KEY
  - name: Set GEMINI_API_KEY
    run: echo "${{ secrets.GEMINI_API_KEY }}" | wrangler secret put GEMINI_API_KEY
  - name: Set VOYAGE_API_KEY
    run: echo "${{ secrets.VOYAGE_API_KEY }}" | wrangler secret put VOYAGE_API_KEY
  ```

### 7.4 구 Vectorize 인덱스 삭제
- [ ] 1주일 모니터링 후 삭제:
  ```bash
  wrangler vectorize delete vox-mind-embeddings
  ```

### 7.5 최종 테스트
- [ ] 전체 빌드:
  ```bash
  npm run build
  ```
- [ ] 타입 체크:
  ```bash
  npm run typecheck
  ```
- [ ] 린트:
  ```bash
  npm run lint
  ```

### 7.6 프로덕션 배포
- [ ] main 브랜치에 푸시:
  ```bash
  git add .
  git commit -m "refactor: Migrate to Cloudflare Workers AI and Workflows"
  git push origin main
  ```
- [ ] GitHub Actions 배포 확인
- [ ] 프로덕션 E2E 테스트

### 7.7 CLAUDE.md 업데이트
**파일**: `CLAUDE.md`

- [ ] AI 파이프라인 섹션 업데이트:
  ```markdown
  ## AI 파이프라인 (Cloudflare Native)
  ```
  녹음 → R2 저장
    → Workers AI STT (@cf/openai/whisper-large-v3-turbo)
    → Workers AI 구조화 (@cf/meta/llama-4-scout-17b-16e-instruct)
    → Workers AI 임베딩 (@cf/baai/bge-m3, 1024d)
    → D1 저장 + Vectorize 저장
    → R2 삭제
  ```
  오케스트레이션: Cloudflare Workflows (자동 재시도, 상태 추적)
  ```

---

## 완료 확인 체크리스트

### 기능 테스트
- [ ] 새 메모 녹음 및 처리 완료
- [ ] 처리 중 상태 표시 정상
- [ ] 메모 목록 조회 정상
- [ ] 메모 상세 조회 정상
- [ ] 벡터 검색 정상 (RAG 기능)

### 성능 확인
- [ ] STT 처리 시간: ____ 초 (목표: < 녹음길이의 20%)
- [ ] 전체 파이프라인: ____ 초 (목표: < 60초)
- [ ] 프론트엔드 응답성 정상

### 비용 확인
- [ ] 외부 API 비용: $0 (목표 달성)
- [ ] Workers AI 사용량 모니터링 설정

---

## 롤백 계획

문제 발생 시:
1. wrangler.toml에서 Workflow 바인딩 제거
2. api.ts에서 기존 동기 처리 로직 복원
3. 외부 API 시크릿 재설정
4. 기존 Vectorize 인덱스로 복귀

---

## 참고 문서

- [Cloudflare Workers AI 모델 카탈로그](https://developers.cloudflare.com/workers-ai/models/)
- [Cloudflare Workflows 문서](https://developers.cloudflare.com/workflows/)
- [Cloudflare Vectorize 문서](https://developers.cloudflare.com/vectorize/)
- [BGE-M3 모델 정보](https://developers.cloudflare.com/workers-ai/models/bge-m3/)
- [Whisper v3 Turbo 정보](https://developers.cloudflare.com/workers-ai/models/whisper-large-v3-turbo/)
