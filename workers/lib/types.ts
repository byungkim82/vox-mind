// Cloudflare Workers specific types
import type { Workflow } from 'cloudflare:workers';

// Import and re-export shared types
import type { MemoCategory as _MemoCategory } from '../../shared/types';
export type MemoCategory = _MemoCategory;
export { MEMO_CATEGORIES } from '../../shared/types';

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
  // Groq STT
  GROQ_API_KEY: string;
  // R2 Presigned URL 생성용
  CLOUDFLARE_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
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

export interface MemoStructure {
  title: string;
  summary: string;
  category: MemoCategory;
  action_items: string[];
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

