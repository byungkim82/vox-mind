import { Suspense } from 'react';
import { MemoList } from '@/components/MemoList';

function MemoListLoading() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="h-8 bg-gray-200 rounded w-32 mb-6 animate-pulse" />
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-10 bg-gray-200 rounded-full w-16 animate-pulse" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 animate-pulse">
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
        ))}
      </div>
    </div>
  );
}

export default function MemosPage() {
  return (
    <Suspense fallback={<MemoListLoading />}>
      <MemoList />
    </Suspense>
  );
}
