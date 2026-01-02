// Cloudflare Workers specific types

export interface Env {
  DB: D1Database;
  AUDIO_BUCKET: R2Bucket;
  VECTORIZE: VectorizeIndex;
  GROQ_API_KEY: string;
  GEMINI_API_KEY: string;
  VOYAGE_API_KEY: string;
  ENVIRONMENT: string;
  ALLOWED_ORIGINS?: string;
  // Cloudflare Access
  CF_ACCESS_AUD?: string;
  CF_ACCESS_TEAM_NAME?: string;
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
