'use client';

import Link from 'next/link';
import type { MemoSummary, MemoCategory } from '@/lib/types';

interface MemoCardProps {
  memo: MemoSummary;
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

export function MemoCard({ memo }: MemoCardProps) {
  const category = memo.category || '기타';
  const colors = categoryColors[category] || categoryColors['기타'];

  return (
    <Link
      href={`/memos/${memo.id}`}
      className="block bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-gray-900 line-clamp-1">
          {memo.title || '제목 없음'}
        </h3>
        <span className={`flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.text}`}>
          {category}
        </span>
      </div>

      {memo.summary && (
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
          {memo.summary}
        </p>
      )}

      <div className="text-xs text-gray-400">
        {formatDate(memo.created_at)}
      </div>
    </Link>
  );
}
