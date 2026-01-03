// Cloudflare Workers specific types
import type { Workflow } from 'cloudflare:workers';

export interface Env {
  DB: D1Database;
  AUDIO_BUCKET: R2Bucket;
  VECTORIZE: VectorizeIndex;
  ENVIRONMENT: string;
  ALLOWED_ORIGINS?: string;
  // Cloudflare Access
  CF_ACCESS_AUD?: string;
  CF_ACCESS_TEAM_NAME?: string;
  // Workers AI
  AI: Ai;
  // Workflows
  PROCESS_WORKFLOW: Workflow;
}

// Cloudflare Access JWT payload
export interface CloudflareAccessJWTPayload {
  aud: string[];
  email: string;
  exp: number;
  iat: number;
  iss: string;
  sub: string;
  type: string;
  country?: string;
}

// Auth context for Hono
export interface AuthContext {
  userId: string;
  email: string;
}

export type MemoCategory =
  | '업무'
  | '개발'
  | '일기'
  | '아이디어'
  | '학습'
  | '기타';

export interface MemoStructure {
  title: string;
  summary: string;
  category: MemoCategory;
  action_items: string[];
}

// Workers AI Whisper Response
export interface WhisperResponse {
  text: string;
  word_count?: number;
  words?: Array<{ word: string; start: number; end: number }>;
  vtt?: string;
}

// Workers AI BGE-M3 Response
export interface BGEEmbeddingResponse {
  shape: number[];
  data: number[][];
}

// Workers AI LLM Response
export interface LlamaResponse {
  response?: string;
}

// Workflow Parameters
export interface WorkflowParams {
  fileId: string;
  fileName: string;
  userId: string;
}

// Workflow Result
export interface WorkflowResult {
  memoId: string;
  title: string;
  summary: string;
  category: MemoCategory;
  actionItems: string[];
}

// API Response Types
export interface ProcessStartResponse {
  instanceId: string;
  status: 'queued';
  message: string;
}

export interface ProcessStatusResponse {
  instanceId: string;
  status: 'queued' | 'running' | 'paused' | 'errored' | 'complete' | 'terminated';
  output?: WorkflowResult;
  error?: string;
}
