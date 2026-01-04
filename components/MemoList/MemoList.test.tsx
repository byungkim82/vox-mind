import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoList } from './MemoList';

// Mock Next.js navigation
const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => mockSearchParams,
}));

// Mock API client
vi.mock('@/lib/api/client', () => ({
  getMemos: vi.fn(),
  deleteMemo: vi.fn(),
}));

// Mock MemoCard
vi.mock('@/components/MemoCard', () => ({
  MemoCard: ({ memo, onDelete, onClick }: any) => (
    <div data-testid={`memo-card-${memo.id}`}>
      <span>{memo.title}</span>
      <button onClick={() => onClick(memo.id)} data-testid={`click-${memo.id}`}>
        View
      </button>
      <button onClick={() => onDelete(memo.id)} data-testid={`delete-${memo.id}`}>
        Delete
      </button>
    </div>
  ),
}));

// Mock MemoDetailModal
vi.mock('@/components/MemoDetailModal', () => ({
  MemoDetailModal: ({ memoId, onClose, onDelete }: any) =>
    memoId ? (
      <div data-testid="memo-detail-modal">
        <span>Modal for {memoId}</span>
        <button onClick={onClose} data-testid="close-modal">
          Close
        </button>
        <button onClick={() => onDelete(memoId)} data-testid="modal-delete">
          Delete
        </button>
      </div>
    ) : null,
}));

import { getMemos, deleteMemo } from '@/lib/api/client';

describe('MemoList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const mockMemos = [
    {
      id: 'memo-1',
      title: 'First Memo',
      summary: 'Summary 1',
      category: '개발',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
    },
    {
      id: 'memo-2',
      title: 'Second Memo',
      summary: 'Summary 2',
      category: '업무',
      created_at: '2024-01-14T10:00:00Z',
      updated_at: '2024-01-14T10:00:00Z',
    },
  ];

  describe('rendering', () => {
    it('renders loading state initially', async () => {
      vi.mocked(getMemos).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<MemoList />);

      // Should show skeletons while loading
      expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    });

    it('renders memos after loading', async () => {
      vi.mocked(getMemos).mockResolvedValue({
        memos: mockMemos,
        total: 2,
        limit: 20,
        offset: 0,
      });

      render(<MemoList />);

      await waitFor(() => {
        expect(screen.getByText('First Memo')).toBeInTheDocument();
        expect(screen.getByText('Second Memo')).toBeInTheDocument();
      });
    });

    it('renders empty state when no memos', async () => {
      vi.mocked(getMemos).mockResolvedValue({
        memos: [],
        total: 0,
        limit: 20,
        offset: 0,
      });

      render(<MemoList />);

      await waitFor(() => {
        expect(screen.getByText('아직 메모가 없습니다')).toBeInTheDocument();
      });
    });

    it('renders error state on API failure', async () => {
      vi.mocked(getMemos).mockRejectedValue(new Error('Network error'));

      render(<MemoList />);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('renders category filter buttons', async () => {
      vi.mocked(getMemos).mockResolvedValue({
        memos: [],
        total: 0,
        limit: 20,
        offset: 0,
      });

      render(<MemoList />);

      expect(screen.getByText('전체')).toBeInTheDocument();
      expect(screen.getByText('업무')).toBeInTheDocument();
      expect(screen.getByText('개발')).toBeInTheDocument();
      expect(screen.getByText('일기')).toBeInTheDocument();
    });

    it('renders page header', async () => {
      vi.mocked(getMemos).mockResolvedValue({
        memos: [],
        total: 0,
        limit: 20,
        offset: 0,
      });

      render(<MemoList />);

      expect(screen.getByText('메모 리스트')).toBeInTheDocument();
    });
  });

  describe('category filtering', () => {
    it('fetches memos with selected category', async () => {
      vi.mocked(getMemos).mockResolvedValue({
        memos: mockMemos,
        total: 2,
        limit: 20,
        offset: 0,
      });

      render(<MemoList />);

      await waitFor(() => {
        expect(screen.getByText('First Memo')).toBeInTheDocument();
      });

      const devButton = screen.getByText('개발');
      await act(async () => {
        fireEvent.click(devButton);
      });

      expect(getMemos).toHaveBeenCalledWith({
        category: '개발',
        limit: 20,
        offset: 0,
      });
    });

    it('updates URL when category changes', async () => {
      vi.mocked(getMemos).mockResolvedValue({
        memos: [],
        total: 0,
        limit: 20,
        offset: 0,
      });

      render(<MemoList />);

      await waitFor(() => {
        expect(screen.getByText('전체')).toBeInTheDocument();
      });

      const workButton = screen.getByText('업무');
      await act(async () => {
        fireEvent.click(workButton);
      });

      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/memos?category='));
    });

    it('removes category from URL when "all" is selected', async () => {
      vi.mocked(getMemos).mockResolvedValue({
        memos: [],
        total: 0,
        limit: 20,
        offset: 0,
      });

      render(<MemoList />);

      await waitFor(() => {
        expect(screen.getByText('전체')).toBeInTheDocument();
      });

      // First select a category
      const devButton = screen.getByText('개발');
      await act(async () => {
        fireEvent.click(devButton);
      });

      // Then select "all"
      const allButton = screen.getByText('전체');
      await act(async () => {
        fireEvent.click(allButton);
      });

      expect(mockPush).toHaveBeenLastCalledWith('/memos');
    });

    it('shows category-specific empty state message', async () => {
      vi.mocked(getMemos).mockResolvedValue({
        memos: [],
        total: 0,
        limit: 20,
        offset: 0,
      });

      render(<MemoList />);

      await waitFor(() => {
        expect(screen.getByText('전체')).toBeInTheDocument();
      });

      const devButton = screen.getByText('개발');
      await act(async () => {
        fireEvent.click(devButton);
      });

      await waitFor(() => {
        expect(screen.getByText('개발 카테고리에 메모가 없습니다')).toBeInTheDocument();
      });
    });
  });

  describe('pagination', () => {
    it('shows load more button when there are more memos', async () => {
      vi.mocked(getMemos).mockResolvedValue({
        memos: mockMemos,
        total: 50,
        limit: 20,
        offset: 0,
      });

      render(<MemoList />);

      await waitFor(() => {
        expect(screen.getByText(/더 보기/)).toBeInTheDocument();
        expect(screen.getByText(/2 \/ 50/)).toBeInTheDocument();
      });
    });

    it('hides load more button when all memos are loaded', async () => {
      vi.mocked(getMemos).mockResolvedValue({
        memos: mockMemos,
        total: 2,
        limit: 20,
        offset: 0,
      });

      render(<MemoList />);

      await waitFor(() => {
        expect(screen.getByText('First Memo')).toBeInTheDocument();
      });

      expect(screen.queryByText(/더 보기/)).not.toBeInTheDocument();
    });

    it('loads more memos when button is clicked', async () => {
      vi.mocked(getMemos)
        .mockResolvedValueOnce({
          memos: mockMemos,
          total: 50,
          limit: 20,
          offset: 0,
        })
        .mockResolvedValueOnce({
          memos: [
            {
              id: 'memo-3',
              title: 'Third Memo',
              summary: 'Summary 3',
              category: '아이디어',
              created_at: '2024-01-13T10:00:00Z',
              updated_at: '2024-01-13T10:00:00Z',
            },
          ],
          total: 50,
          limit: 20,
          offset: 20,
        });

      render(<MemoList />);

      await waitFor(() => {
        expect(screen.getByText('First Memo')).toBeInTheDocument();
      });

      const loadMoreButton = screen.getByText(/더 보기/);
      await act(async () => {
        fireEvent.click(loadMoreButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Third Memo')).toBeInTheDocument();
      });

      expect(getMemos).toHaveBeenCalledWith({
        category: 'all',
        limit: 20,
        offset: 20,
      });
    });
  });

  describe('memo deletion', () => {
    it('removes memo from list when deleted', async () => {
      vi.mocked(getMemos).mockResolvedValue({
        memos: mockMemos,
        total: 2,
        limit: 20,
        offset: 0,
      });
      vi.mocked(deleteMemo).mockResolvedValue({ success: true, message: 'Deleted' });

      render(<MemoList />);

      await waitFor(() => {
        expect(screen.getByText('First Memo')).toBeInTheDocument();
      });

      const deleteButton = screen.getByTestId('delete-memo-1');
      await act(async () => {
        fireEvent.click(deleteButton);
      });

      await waitFor(() => {
        expect(screen.queryByText('First Memo')).not.toBeInTheDocument();
      });

      expect(screen.getByText('Second Memo')).toBeInTheDocument();
    });
  });

  describe('memo modal', () => {
    it('opens modal when memo is clicked', async () => {
      vi.mocked(getMemos).mockResolvedValue({
        memos: mockMemos,
        total: 2,
        limit: 20,
        offset: 0,
      });

      render(<MemoList />);

      await waitFor(() => {
        expect(screen.getByText('First Memo')).toBeInTheDocument();
      });

      const clickButton = screen.getByTestId('click-memo-1');
      await act(async () => {
        fireEvent.click(clickButton);
      });

      expect(screen.getByTestId('memo-detail-modal')).toBeInTheDocument();
      expect(screen.getByText('Modal for memo-1')).toBeInTheDocument();
    });

    it('closes modal when close is triggered', async () => {
      vi.mocked(getMemos).mockResolvedValue({
        memos: mockMemos,
        total: 2,
        limit: 20,
        offset: 0,
      });

      render(<MemoList />);

      await waitFor(() => {
        expect(screen.getByText('First Memo')).toBeInTheDocument();
      });

      // Open modal
      const clickButton = screen.getByTestId('click-memo-1');
      await act(async () => {
        fireEvent.click(clickButton);
      });

      expect(screen.getByTestId('memo-detail-modal')).toBeInTheDocument();

      // Close modal
      const closeButton = screen.getByTestId('close-modal');
      await act(async () => {
        fireEvent.click(closeButton);
      });

      expect(screen.queryByTestId('memo-detail-modal')).not.toBeInTheDocument();
    });

    it('removes memo from list when deleted from modal', async () => {
      vi.mocked(getMemos).mockResolvedValue({
        memos: mockMemos,
        total: 2,
        limit: 20,
        offset: 0,
      });

      render(<MemoList />);

      await waitFor(() => {
        expect(screen.getByText('First Memo')).toBeInTheDocument();
      });

      // Open modal
      const clickButton = screen.getByTestId('click-memo-1');
      await act(async () => {
        fireEvent.click(clickButton);
      });

      // Delete from modal
      const deleteButton = screen.getByTestId('modal-delete');
      await act(async () => {
        fireEvent.click(deleteButton);
      });

      await waitFor(() => {
        expect(screen.queryByText('First Memo')).not.toBeInTheDocument();
      });
    });
  });
});
