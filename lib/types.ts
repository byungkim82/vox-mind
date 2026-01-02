export interface Memo {
  id: string;
  user_id: string;
  raw_text: string;
  title: string | null;
  summary: string | null;
  category: MemoCategory | null;
  action_items: string | null; // JSON string
  created_at: string;
  updated_at: string;
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

export interface Env {
  DB: D1Database;
  AUDIO_BUCKET: R2Bucket;
  VECTORIZE: VectorizeIndex;
  GROQ_API_KEY: string;
  GEMINI_API_KEY: string;
  VOYAGE_API_KEY: string;
  ENVIRONMENT: string;
}
