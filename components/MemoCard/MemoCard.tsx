'use client';

import { useState } from 'react';
import type { MemoSummary, MemoCategory } from '@/lib/types';

interface MemoCardProps {
  memo: MemoSummary;
  onDelete?: (id: string) => Promise<void>;
  onClick?: (id: string) => void;
}

const categoryStyles: Record<MemoCategory, {
  gradient: string;
  badge: string;
  dot: string;
  hover: string;
}> = {
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

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return '오늘';
  } else if (diffDays === 1) {
    return '어제';
  } else if (diffDays < 7) {
    return `${diffDays}일 전`;
  } else {
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}

export function MemoCard({ memo, onDelete, onClick }: MemoCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const category = memo.category || '기타';
  const styles = categoryStyles[category] || categoryStyles['기타'];

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirm(true);
  };

  const handleConfirmDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onDelete) return;

    setIsDeleting(true);
    try {
      await onDelete(memo.id);
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirm(false);
  };

  const handleClick = () => {
    onClick?.(memo.id);
  };

  return (
    <div className="relative group">
      <button
        onClick={handleClick}
        className={`block w-full text-left bg-surface-dark rounded-2xl border border-surface-lighter overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${styles.hover}`}
      >
        {/* Gradient top bar */}
        <div className={`h-1.5 w-full ${styles.gradient}`} />

        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles.badge}`}>
              <span className={`size-1.5 rounded-full ${styles.dot}`} />
              {category}
            </span>
            {onDelete && (
              <button
                onClick={handleDeleteClick}
                className="flex-shrink-0 p-1 text-text-secondary hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                aria-label="메모 삭제"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>

          <h3 className="font-bold text-white text-lg mb-2 line-clamp-1 leading-snug">
            {memo.title || '제목 없음'}
          </h3>

          {memo.summary && (
            <p className="text-sm text-text-secondary line-clamp-2 mb-3 leading-relaxed">
              {memo.summary}
            </p>
          )}

          <div className="pt-3 border-t border-surface-lighter">
            <span className="text-xs text-text-secondary/70 font-medium">
              {formatDate(memo.created_at)}
            </span>
          </div>
        </div>
      </button>

      {/* Delete confirmation overlay */}
      {showConfirm && (
        <div className="absolute inset-0 bg-surface-dark/95 rounded-2xl flex items-center justify-center gap-3 border border-red-500/30">
          <span className="text-sm text-white">삭제할까요?</span>
          <button
            onClick={handleConfirmDelete}
            disabled={isDeleting}
            className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            {isDeleting ? '삭제 중...' : '삭제'}
          </button>
          <button
            onClick={handleCancelDelete}
            disabled={isDeleting}
            className="px-3 py-1.5 bg-surface-lighter text-white text-sm rounded-lg hover:bg-surface-lighter/80 disabled:opacity-50 transition-colors"
          >
            취소
          </button>
        </div>
      )}
    </div>
  );
}
