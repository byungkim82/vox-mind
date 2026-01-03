'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getMemo, deleteMemo } from '@/lib/api/client';
import type { MemoDetail as MemoDetailType, MemoCategory } from '@/lib/types';

const categoryColors: Record<MemoCategory, { bg: string; text: string }> = {
  '업무': { bg: 'bg-blue-100', text: 'text-blue-700' },
  '개발': { bg: 'bg-purple-100', text: 'text-purple-700' },
  '일기': { bg: 'bg-green-100', text: 'text-green-700' },
  '아이디어': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  '학습': { bg: 'bg-orange-100', text: 'text-orange-700' },
  '기타': { bg: 'bg-gray-100', text: 'text-gray-700' },
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function MemoDetailSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-3/4 mb-4" />
      <div className="flex gap-2 mb-6">
        <div className="h-6 bg-gray-200 rounded w-16" />
        <div className="h-6 bg-gray-200 rounded w-32" />
      </div>
      <div className="space-y-3 mb-8">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
      </div>
      <div className="h-6 bg-gray-200 rounded w-24 mb-4" />
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-4/5" />
      </div>
    </div>
  );
}

export function MemoDetail() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [memo, setMemo] = useState<MemoDetailType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!id || id === '_placeholder') {
      return;
    }

    async function fetchMemo() {
      try {
        const data = await getMemo(id);
        setMemo(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '메모를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchMemo();
  }, [id]);

  const handleDelete = async () => {
    if (!memo) return;

    setIsDeleting(true);
    try {
      await deleteMemo(memo.id);
      router.push('/memos');
    } catch (err) {
      setError(err instanceof Error ? err.message : '메모 삭제에 실패했습니다.');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">
          {error}
        </div>
        <Link
          href="/memos"
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          &larr; 메모 목록으로
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back button */}
      <Link
        href="/memos"
        className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        메모 목록
      </Link>

      {isLoading ? (
        <MemoDetailSkeleton />
      ) : memo ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              {memo.title || '제목 없음'}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {memo.category && (
                <span className={`px-3 py-1 rounded-full font-medium ${categoryColors[memo.category]?.bg || 'bg-gray-100'} ${categoryColors[memo.category]?.text || 'text-gray-700'}`}>
                  {memo.category}
                </span>
              )}
              <span className="text-gray-500">
                {formatDate(memo.created_at)}
              </span>
            </div>
          </div>

          {/* Summary */}
          {memo.summary && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                요약
              </h2>
              <p className="text-gray-700 bg-gray-50 rounded-lg p-4">
                {memo.summary}
              </p>
            </div>
          )}

          {/* Action items */}
          {memo.action_items && memo.action_items.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                액션 아이템
              </h2>
              <ul className="space-y-2">
                {memo.action_items.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Raw text */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              전체 전사 텍스트
            </h2>
            <div className="text-gray-700 bg-gray-50 rounded-lg p-4 whitespace-pre-wrap">
              {memo.raw_text}
            </div>
          </div>

          {/* Delete button */}
          <div className="pt-4 border-t border-gray-200">
            {showDeleteConfirm ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">정말 삭제하시겠습니까?</span>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {isDeleting ? '삭제 중...' : '삭제'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  취소
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-600 hover:text-red-700 font-medium transition-colors"
              >
                메모 삭제
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
