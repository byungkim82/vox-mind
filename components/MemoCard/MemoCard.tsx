'use client';

import { useState } from 'react';
import type { MemoSummary, MemoCategory } from '@/lib/types';

interface MemoCardProps {
  memo: MemoSummary;
  onDelete?: (id: string) => Promise<void>;
}

const categoryColors: Record<MemoCategory, { bg: string; text: string }> = {
  '업무': { bg: 'bg-blue-100', text: 'text-blue-700' },
  '개발': { bg: 'bg-purple-100', text: 'text-purple-700' },
  '일기': { bg: 'bg-green-100', text: 'text-green-700' },
  '아이디어': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  '학습': { bg: 'bg-orange-100', text: 'text-orange-700' },
  '기타': { bg: 'bg-gray-100', text: 'text-gray-700' },
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

export function MemoCard({ memo, onDelete }: MemoCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const category = memo.category || '기타';
  const colors = categoryColors[category] || categoryColors['기타'];

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

  return (
    <div className="relative">
      <a
        href={`/memos/${memo.id}`}
        className="block bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-gray-900 line-clamp-1 flex-1">
            {memo.title || '제목 없음'}
          </h3>
          <span className={`flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.text}`}>
            {category}
          </span>
          {onDelete && (
            <button
              onClick={handleDeleteClick}
              className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors"
              aria-label="메모 삭제"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>

        {memo.summary && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
            {memo.summary}
          </p>
        )}

        <div className="text-xs text-gray-400">
          {formatDate(memo.created_at)}
        </div>
      </a>

      {/* Delete confirmation overlay */}
      {showConfirm && (
        <div className="absolute inset-0 bg-white/95 rounded-lg flex items-center justify-center gap-3 border border-red-200">
          <span className="text-sm text-gray-700">삭제할까요?</span>
          <button
            onClick={handleConfirmDelete}
            disabled={isDeleting}
            className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 disabled:opacity-50"
          >
            {isDeleting ? '삭제 중...' : '삭제'}
          </button>
          <button
            onClick={handleCancelDelete}
            disabled={isDeleting}
            className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 disabled:opacity-50"
          >
            취소
          </button>
        </div>
      )}
    </div>
  );
}
