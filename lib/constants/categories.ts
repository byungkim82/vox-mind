import type { MemoCategory } from '../types';

/**
 * Category style definitions with all variants
 */
export interface CategoryStyleSet {
  /** Gradient for MemoCard top bar */
  gradient: string;
  /** Badge background/text/ring classes */
  badge: string;
  /** Badge dot color */
  dot: string;
  /** Card hover effects */
  hover: string;
}

/**
 * Complete category styles for MemoCard
 */
export const CATEGORY_STYLES: Record<MemoCategory, CategoryStyleSet> = {
  '업무': {
    gradient: 'bg-gradient-to-r from-blue-500 to-primary',
    badge: 'bg-blue-500/10 text-blue-400 ring-blue-500/20',
    dot: 'bg-blue-400',
    hover: 'hover:border-primary/50 hover:shadow-primary/10',
  },
  '개발': {
    gradient: 'bg-gradient-to-r from-purple-600 to-purple-400',
    badge: 'bg-purple-500/10 text-purple-400 ring-purple-500/20',
    dot: 'bg-purple-400',
    hover: 'hover:border-purple-500/50 hover:shadow-purple-500/10',
  },
  '일기': {
    gradient: 'bg-gradient-to-r from-green-600 to-green-400',
    badge: 'bg-green-500/10 text-green-400 ring-green-500/20',
    dot: 'bg-green-400',
    hover: 'hover:border-green-500/50 hover:shadow-green-500/10',
  },
  '아이디어': {
    gradient: 'bg-gradient-to-r from-yellow-600 to-yellow-400',
    badge: 'bg-yellow-500/10 text-yellow-400 ring-yellow-500/20',
    dot: 'bg-yellow-400',
    hover: 'hover:border-yellow-500/50 hover:shadow-yellow-500/10',
  },
  '학습': {
    gradient: 'bg-gradient-to-r from-emerald-600 to-emerald-400',
    badge: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
    dot: 'bg-emerald-400',
    hover: 'hover:border-emerald-500/50 hover:shadow-emerald-500/10',
  },
  '기타': {
    gradient: 'bg-gradient-to-r from-gray-500 to-gray-400',
    badge: 'bg-gray-500/10 text-gray-400 ring-gray-500/20',
    dot: 'bg-gray-400',
    hover: 'hover:border-gray-500/50 hover:shadow-gray-500/10',
  },
};

/**
 * Get category styles with fallback to '기타'
 */
export function getCategoryStyles(category: MemoCategory | null | undefined): CategoryStyleSet {
  return CATEGORY_STYLES[category ?? '기타'] ?? CATEGORY_STYLES['기타'];
}

/**
 * Get badge style only (for simpler use cases like MemoDetailModal)
 */
export function getCategoryBadgeStyle(category: MemoCategory | null | undefined): string {
  return getCategoryStyles(category).badge;
}

/**
 * All valid categories
 */
export const CATEGORIES: readonly MemoCategory[] = [
  '업무',
  '개발',
  '일기',
  '아이디어',
  '학습',
  '기타',
] as const;

/**
 * Category labels for filter UI (includes 'all')
 */
export const CATEGORY_FILTER_OPTIONS: readonly (MemoCategory | 'all')[] = [
  'all',
  '업무',
  '개발',
  '일기',
  '아이디어',
  '학습',
  '기타',
] as const;

/**
 * Category labels for display
 */
export const CATEGORY_LABELS: Record<MemoCategory | 'all', string> = {
  all: '전체',
  '업무': '업무',
  '개발': '개발',
  '일기': '일기',
  '아이디어': '아이디어',
  '학습': '학습',
  '기타': '기타',
};
