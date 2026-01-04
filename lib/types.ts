export type MemoCategory =
  | '업무'
  | '개발'
  | '일기'
  | '아이디어'
  | '학습'
  | '기타';

// Recording states
export type RecordingState = 'idle' | 'recording' | 'processing';

// API responses
export interface UploadResponse {
  fileId: string;
  fileName: string;
  uploadedAt: string;
  size: number;
  type: string;
}

export interface ApiError {
  error: string;
  details?: string;
}

// Workflow API Types
export interface ProcessStartResponse {
  instanceId: string;
  status: 'queued';
  message: string;
}

// Toast types
export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

// Memo list response
export interface MemoListResponse {
  memos: MemoSummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface MemoSummary {
  id: string;
  title: string | null;
  summary: string | null;
  category: MemoCategory | null;
  created_at: string;
  updated_at: string;
}

// Memo detail (with parsed action_items)
export interface MemoDetail {
  id: string;
  user_id: string;
  raw_text: string;
  title: string | null;
  summary: string | null;
  category: MemoCategory | null;
  action_items: string[];
  audio_file_name: string | null;
  created_at: string;
  updated_at: string;
}

// Chat types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
  timestamp: Date;
}

export interface ChatSource {
  id: string;
  title: string;
  summary: string;
  category: string;
  created_at: string;
}

export interface ChatResponse {
  answer: string;
  sources: ChatSource[];
}

// Delete response
export interface DeleteResponse {
  success: boolean;
  message: string;
}

// Audio URL response
export interface AudioUrlResponse {
  audioUrl: string;
}
