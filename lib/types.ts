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

export interface ProcessResponse {
  memoId: string;
  title: string;
  summary: string;
  category: MemoCategory;
  actionItems: string[];
  rawTextLength: number;
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

export interface ProcessStatusResponse {
  instanceId: string;
  status: 'queued' | 'running' | 'paused' | 'errored' | 'complete' | 'terminated';
  output?: {
    memoId: string;
    title: string;
    summary: string;
    category: MemoCategory;
    actionItems: string[];
  };
  error?: string;
}

// Toast types
export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}
