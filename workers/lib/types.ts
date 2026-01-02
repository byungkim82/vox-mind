// Cloudflare Workers specific types

export interface Env {
  DB: D1Database;
  AUDIO_BUCKET: R2Bucket;
  VECTORIZE: VectorizeIndex;
  GROQ_API_KEY: string;
  GEMINI_API_KEY: string;
  VOYAGE_API_KEY: string;
  ENVIRONMENT: string;
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
