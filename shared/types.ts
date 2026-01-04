/**
 * Shared types between frontend (Next.js) and backend (Cloudflare Workers).
 * This file is the single source of truth for types used across both platforms.
 */

/**
 * Memo categories used for categorizing voice memos.
 * All Korean labels for consistency with the UI.
 */
export type MemoCategory =
  | '업무'
  | '개발'
  | '일기'
  | '아이디어'
  | '학습'
  | '기타';

/**
 * All available memo categories as a constant array.
 */
export const MEMO_CATEGORIES: readonly MemoCategory[] = [
  '업무',
  '개발',
  '일기',
  '아이디어',
  '학습',
  '기타',
] as const;
