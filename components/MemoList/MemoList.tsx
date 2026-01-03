'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getMemos, deleteMemo } from '@/lib/api/client';
import { MemoCard } from '@/components/MemoCard';
import { MemoDetailModal } from '@/components/MemoDetailModal';
import type { MemoSummary, MemoCategory } from '@/lib/types';

const categories: (MemoCategory | 'all')[] = ['all', '업무', '개발', '일기', '아이디어', '학습', '기타'];

const categoryLabels: Record<MemoCategory | 'all', string> = {
  all: '전체',
  '업무': '업무',
  '개발': '개발',
  '일기': '일기',
  '아이디어': '아이디어',
  '학습': '학습',
  '기타': '기타',
};

function MemoSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 animate-pulse">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="h-5 bg-gray-200 rounded w-2/3" />
        <div className="h-5 bg-gray-200 rounded w-12" />
      </div>
      <div className="space-y-2 mb-3">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-4/5" />
      </div>
      <div className="h-3 bg-gray-200 rounded w-16" />
    </div>
  );
}

export function MemoList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category') as MemoCategory | 'all' | null;

  const [memos, setMemos] = useState<MemoSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<MemoCategory | 'all'>(categoryParam || 'all');
  const [offset, setOffset] = useState(0);
  const [selectedMemoId, setSelectedMemoId] = useState<string | null>(null);
  const limit = 20;

  const fetchMemos = useCallback(async (category: MemoCategory | 'all', newOffset: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getMemos({
        category,
        limit,
        offset: newOffset,
      });
      if (newOffset === 0) {
        setMemos(response.memos);
      } else {
        setMemos((prev) => [...prev, ...response.memos]);
      }
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : '메모를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMemos(selectedCategory, 0);
    setOffset(0);
  }, [selectedCategory, fetchMemos]);

  const handleCategoryChange = (category: MemoCategory | 'all') => {
    setSelectedCategory(category);
    const params = new URLSearchParams(searchParams.toString());
    if (category === 'all') {
      params.delete('category');
    } else {
      params.set('category', category);
    }
    router.push(`/memos${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const handleLoadMore = () => {
    const newOffset = offset + limit;
    setOffset(newOffset);
    fetchMemos(selectedCategory, newOffset);
  };

  const handleDelete = useCallback(async (id: string) => {
    await deleteMemo(id);
    setMemos((prev) => prev.filter((memo) => memo.id !== id));
    setTotal((prev) => prev - 1);
  }, []);

  const handleMemoClick = useCallback((id: string) => {
    setSelectedMemoId(id);
  }, []);

  const handleModalClose = useCallback(() => {
    setSelectedMemoId(null);
  }, []);

  const handleModalDelete = useCallback((id: string) => {
    setMemos((prev) => prev.filter((memo) => memo.id !== id));
    setTotal((prev) => prev - 1);
  }, []);

  const hasMore = memos.length < total;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">내 메모</h1>

      {/* Category filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => handleCategoryChange(category)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === category
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {categoryLabels[category]}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && memos.length === 0 && (
        <div className="text-center py-12">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-lg font-medium text-gray-600 mb-2">
            {selectedCategory === 'all' ? '아직 메모가 없습니다' : `${categoryLabels[selectedCategory]} 카테고리에 메모가 없습니다`}
          </p>
          <p className="text-sm text-gray-500">
            홈에서 음성 메모를 녹음해보세요
          </p>
        </div>
      )}

      {/* Memo list */}
      <div className="space-y-3">
        {memos.map((memo) => (
          <MemoCard key={memo.id} memo={memo} onDelete={handleDelete} onClick={handleMemoClick} />
        ))}

        {/* Loading skeletons */}
        {isLoading && (
          <>
            <MemoSkeleton />
            <MemoSkeleton />
            <MemoSkeleton />
          </>
        )}
      </div>

      {/* Load more button */}
      {!isLoading && hasMore && (
        <div className="mt-6 text-center">
          <button
            onClick={handleLoadMore}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            더 보기 ({memos.length} / {total})
          </button>
        </div>
      )}

      {/* Memo detail modal */}
      <MemoDetailModal
        memoId={selectedMemoId}
        onClose={handleModalClose}
        onDelete={handleModalDelete}
      />
    </div>
  );
}
