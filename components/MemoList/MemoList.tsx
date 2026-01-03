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
    <div className="bg-surface-dark rounded-2xl border border-surface-lighter p-4 animate-pulse">
      <div className="h-1.5 w-full bg-surface-lighter rounded-t-2xl -mt-4 -mx-4 mb-4" style={{ width: 'calc(100% + 2rem)' }} />
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="h-5 bg-surface-lighter rounded w-16" />
        <div className="h-5 bg-surface-lighter rounded w-8" />
      </div>
      <div className="h-6 bg-surface-lighter rounded w-2/3 mb-2" />
      <div className="space-y-2 mb-3">
        <div className="h-4 bg-surface-lighter rounded w-full" />
        <div className="h-4 bg-surface-lighter rounded w-4/5" />
      </div>
      <div className="pt-3 border-t border-surface-lighter">
        <div className="h-3 bg-surface-lighter rounded w-16" />
      </div>
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
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2">메모 리스트</h1>
        <p className="text-text-secondary text-base">AI가 정리한 음성 기록과 메모를 한눈에 확인하세요.</p>
      </div>

      {/* Category filter */}
      <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => handleCategoryChange(category)}
            className={`flex-shrink-0 h-9 px-4 rounded-lg text-sm font-medium transition-all active:scale-95 ${
              selectedCategory === category
                ? 'bg-primary text-background-dark'
                : 'bg-surface-lighter text-white hover:bg-surface-dark border border-transparent hover:border-surface-lighter'
            }`}
          >
            {categoryLabels[category]}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-4">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && memos.length === 0 && (
        <div className="text-center py-12">
          <svg className="w-16 h-16 mx-auto mb-4 text-surface-lighter" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-lg font-medium text-white mb-2">
            {selectedCategory === 'all' ? '아직 메모가 없습니다' : `${categoryLabels[selectedCategory]} 카테고리에 메모가 없습니다`}
          </p>
          <p className="text-sm text-text-secondary">
            홈에서 음성 메모를 녹음해보세요
          </p>
        </div>
      )}

      {/* Memo list */}
      <div className="space-y-4">
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
            className="px-6 py-2.5 bg-surface-lighter text-white rounded-xl hover:bg-surface-dark transition-colors font-medium"
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
