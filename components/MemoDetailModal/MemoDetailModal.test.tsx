import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoDetailModal } from './MemoDetailModal';
import type { MemoDetail, MemoCategory } from '@/lib/types';

// Mock API client
vi.mock('@/lib/api/client', () => ({
  getMemo: vi.fn(),
  deleteMemo: vi.fn(),
  getAudioUrl: vi.fn(),
}));

import { getMemo, deleteMemo, getAudioUrl } from '@/lib/api/client';

describe('MemoDetailModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
    document.body.style.overflow = '';
  });

  const mockMemo: MemoDetail = {
    id: 'memo-123',
    user_id: 'user-1',
    raw_text: 'This is the full transcription text.',
    title: 'Test Memo',
    summary: 'This is a summary of the memo.',
    category: '개발' as MemoCategory,
    action_items: ['Task 1', 'Task 2', 'Task 3'],
    audio_file_name: 'recording.webm',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  };

  describe('rendering', () => {
    it('renders nothing when memoId is null', () => {
      const onClose = vi.fn();
      const { container } = render(
        <MemoDetailModal memoId={null} onClose={onClose} />
      );

      expect(container.firstChild).toBeNull();
    });

    it('renders loading state initially', async () => {
      vi.mocked(getMemo).mockImplementation(() => new Promise(() => {}));

      render(<MemoDetailModal memoId="memo-123" onClose={vi.fn()} />);

      // Should show skeleton loading
      expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    });

    it('renders memo details after loading', async () => {
      vi.mocked(getMemo).mockResolvedValue(mockMemo);
      vi.mocked(getAudioUrl).mockResolvedValue({
        audioUrl: 'https://example.com/audio.webm',
      });

      render(<MemoDetailModal memoId="memo-123" onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Test Memo')).toBeInTheDocument();
        expect(screen.getByText('This is a summary of the memo.')).toBeInTheDocument();
        expect(screen.getByText('개발')).toBeInTheDocument();
      });
    });

    it('renders action items', async () => {
      vi.mocked(getMemo).mockResolvedValue(mockMemo);
      vi.mocked(getAudioUrl).mockResolvedValue({
        audioUrl: 'https://example.com/audio.webm',
      });

      render(<MemoDetailModal memoId="memo-123" onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
        expect(screen.getByText('Task 2')).toBeInTheDocument();
        expect(screen.getByText('Task 3')).toBeInTheDocument();
      });
    });

    it('renders raw text section', async () => {
      vi.mocked(getMemo).mockResolvedValue(mockMemo);
      vi.mocked(getAudioUrl).mockResolvedValue({
        audioUrl: 'https://example.com/audio.webm',
      });

      render(<MemoDetailModal memoId="memo-123" onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('This is the full transcription text.')).toBeInTheDocument();
      });
    });

    it('renders error state on API failure', async () => {
      vi.mocked(getMemo).mockRejectedValue(new Error('Failed to fetch'));

      render(<MemoDetailModal memoId="memo-123" onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
      });
    });

    it('shows default error message for non-Error throws', async () => {
      vi.mocked(getMemo).mockRejectedValue('Unknown error');

      render(<MemoDetailModal memoId="memo-123" onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('메모를 불러오는데 실패했습니다.')).toBeInTheDocument();
      });
    });

    it('shows "제목 없음" for memo without title', async () => {
      vi.mocked(getMemo).mockResolvedValue({
        ...mockMemo,
        title: null,
      });
      vi.mocked(getAudioUrl).mockResolvedValue({
        audioUrl: 'https://example.com/audio.webm',
      });

      render(<MemoDetailModal memoId="memo-123" onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('제목 없음')).toBeInTheDocument();
      });
    });
  });

  describe('audio player', () => {
    it('renders audio player when audio is available', async () => {
      vi.mocked(getMemo).mockResolvedValue(mockMemo);
      vi.mocked(getAudioUrl).mockResolvedValue({
        audioUrl: 'https://example.com/audio.webm',
      });

      render(<MemoDetailModal memoId="memo-123" onClose={vi.fn()} />);

      await waitFor(() => {
        const audioElement = document.querySelector('audio');
        expect(audioElement).toBeInTheDocument();
        expect(audioElement?.src).toBe('https://example.com/audio.webm');
      });
    });

    it('shows audio loading state then audio player', async () => {
      vi.mocked(getMemo).mockResolvedValue(mockMemo);
      vi.mocked(getAudioUrl).mockResolvedValue({
        audioUrl: 'https://example.com/audio.webm',
      });

      render(<MemoDetailModal memoId="memo-123" onClose={vi.fn()} />);

      // Wait for memo and audio to load
      await waitFor(() => {
        expect(screen.getByText('Test Memo')).toBeInTheDocument();
      });

      // Eventually audio player should appear
      await waitFor(() => {
        const audioElement = document.querySelector('audio');
        expect(audioElement).toBeInTheDocument();
      });
    });

    it('shows error message when audio fails to load', async () => {
      vi.mocked(getMemo).mockResolvedValue(mockMemo);
      vi.mocked(getAudioUrl).mockRejectedValue(new Error('Audio not found'));

      render(<MemoDetailModal memoId="memo-123" onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('오디오를 불러올 수 없습니다')).toBeInTheDocument();
      });
    });

    it('does not fetch audio when no audio file', async () => {
      vi.mocked(getMemo).mockResolvedValue({
        ...mockMemo,
        audio_file_name: null,
      });

      render(<MemoDetailModal memoId="memo-123" onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Test Memo')).toBeInTheDocument();
      });

      expect(getAudioUrl).not.toHaveBeenCalled();
    });
  });

  describe('modal behavior', () => {
    it('calls onClose when backdrop is clicked', async () => {
      vi.mocked(getMemo).mockResolvedValue(mockMemo);
      vi.mocked(getAudioUrl).mockResolvedValue({ audioUrl: 'https://example.com/audio.webm' });
      const onClose = vi.fn();

      render(<MemoDetailModal memoId="memo-123" onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText('Test Memo')).toBeInTheDocument();
      });

      // Click backdrop
      const backdrop = document.querySelector('.fixed.inset-0');
      await act(async () => {
        fireEvent.click(backdrop!);
      });

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when close button is clicked', async () => {
      vi.mocked(getMemo).mockResolvedValue(mockMemo);
      vi.mocked(getAudioUrl).mockResolvedValue({ audioUrl: 'https://example.com/audio.webm' });
      const onClose = vi.fn();

      render(<MemoDetailModal memoId="memo-123" onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText('Test Memo')).toBeInTheDocument();
      });

      const closeButton = screen.getByLabelText('닫기');
      await act(async () => {
        fireEvent.click(closeButton);
      });

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when Escape key is pressed', async () => {
      vi.mocked(getMemo).mockResolvedValue(mockMemo);
      vi.mocked(getAudioUrl).mockResolvedValue({ audioUrl: 'https://example.com/audio.webm' });
      const onClose = vi.fn();

      render(<MemoDetailModal memoId="memo-123" onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText('Test Memo')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.keyDown(document, { key: 'Escape' });
      });

      expect(onClose).toHaveBeenCalled();
    });

    it('prevents body scroll when modal is open', async () => {
      vi.mocked(getMemo).mockResolvedValue(mockMemo);
      vi.mocked(getAudioUrl).mockResolvedValue({ audioUrl: 'https://example.com/audio.webm' });

      render(<MemoDetailModal memoId="memo-123" onClose={vi.fn()} />);

      await waitFor(() => {
        expect(document.body.style.overflow).toBe('hidden');
      });
    });

    it('restores body scroll when modal is closed', async () => {
      vi.mocked(getMemo).mockResolvedValue(mockMemo);
      vi.mocked(getAudioUrl).mockResolvedValue({ audioUrl: 'https://example.com/audio.webm' });

      const { rerender } = render(
        <MemoDetailModal memoId="memo-123" onClose={vi.fn()} />
      );

      await waitFor(() => {
        expect(document.body.style.overflow).toBe('hidden');
      });

      rerender(<MemoDetailModal memoId={null} onClose={vi.fn()} />);

      expect(document.body.style.overflow).toBe('');
    });

    it('does not close when clicking inside modal content', async () => {
      vi.mocked(getMemo).mockResolvedValue(mockMemo);
      vi.mocked(getAudioUrl).mockResolvedValue({ audioUrl: 'https://example.com/audio.webm' });
      const onClose = vi.fn();

      render(<MemoDetailModal memoId="memo-123" onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText('Test Memo')).toBeInTheDocument();
      });

      // Click inside modal content
      const title = screen.getByText('Test Memo');
      await act(async () => {
        fireEvent.click(title);
      });

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('deletion', () => {
    it('shows delete confirmation when delete button is clicked', async () => {
      vi.mocked(getMemo).mockResolvedValue(mockMemo);
      vi.mocked(getAudioUrl).mockResolvedValue({ audioUrl: 'https://example.com/audio.webm' });

      render(<MemoDetailModal memoId="memo-123" onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Test Memo')).toBeInTheDocument();
      });

      const deleteButton = screen.getByText('메모 삭제');
      await act(async () => {
        fireEvent.click(deleteButton);
      });

      expect(screen.getByText('정말 삭제하시겠습니까?')).toBeInTheDocument();
      expect(screen.getByText('삭제')).toBeInTheDocument();
      expect(screen.getByText('취소')).toBeInTheDocument();
    });

    it('hides confirmation when cancel is clicked', async () => {
      vi.mocked(getMemo).mockResolvedValue(mockMemo);
      vi.mocked(getAudioUrl).mockResolvedValue({ audioUrl: 'https://example.com/audio.webm' });

      render(<MemoDetailModal memoId="memo-123" onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Test Memo')).toBeInTheDocument();
      });

      const deleteButton = screen.getByText('메모 삭제');
      await act(async () => {
        fireEvent.click(deleteButton);
      });

      const cancelButton = screen.getByText('취소');
      await act(async () => {
        fireEvent.click(cancelButton);
      });

      expect(screen.queryByText('정말 삭제하시겠습니까?')).not.toBeInTheDocument();
    });

    it('deletes memo and calls callbacks on confirm', async () => {
      vi.mocked(getMemo).mockResolvedValue(mockMemo);
      vi.mocked(getAudioUrl).mockResolvedValue({ audioUrl: 'https://example.com/audio.webm' });
      vi.mocked(deleteMemo).mockResolvedValue({ success: true, message: 'Deleted' });

      const onClose = vi.fn();
      const onDelete = vi.fn();

      render(<MemoDetailModal memoId="memo-123" onClose={onClose} onDelete={onDelete} />);

      await waitFor(() => {
        expect(screen.getByText('Test Memo')).toBeInTheDocument();
      });

      const deleteButton = screen.getByText('메모 삭제');
      await act(async () => {
        fireEvent.click(deleteButton);
      });

      const confirmButton = screen.getByText('삭제');
      await act(async () => {
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(deleteMemo).toHaveBeenCalledWith('memo-123');
        expect(onDelete).toHaveBeenCalledWith('memo-123');
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('shows error when deletion fails', async () => {
      vi.mocked(getMemo).mockResolvedValue(mockMemo);
      vi.mocked(getAudioUrl).mockResolvedValue({ audioUrl: 'https://example.com/audio.webm' });
      vi.mocked(deleteMemo).mockRejectedValue(new Error('Deletion failed'));

      render(<MemoDetailModal memoId="memo-123" onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Test Memo')).toBeInTheDocument();
      });

      const deleteButton = screen.getByText('메모 삭제');
      await act(async () => {
        fireEvent.click(deleteButton);
      });

      const confirmButton = screen.getByText('삭제');
      await act(async () => {
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Deletion failed')).toBeInTheDocument();
      });
    });

    it('shows deleting state during deletion', async () => {
      vi.mocked(getMemo).mockResolvedValue(mockMemo);
      vi.mocked(getAudioUrl).mockResolvedValue({ audioUrl: 'https://example.com/audio.webm' });
      vi.mocked(deleteMemo).mockImplementation(() => new Promise(() => {}));

      render(<MemoDetailModal memoId="memo-123" onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Test Memo')).toBeInTheDocument();
      });

      const deleteButton = screen.getByText('메모 삭제');
      await act(async () => {
        fireEvent.click(deleteButton);
      });

      const confirmButton = screen.getByText('삭제');
      await act(async () => {
        fireEvent.click(confirmButton);
      });

      expect(screen.getByText('삭제 중...')).toBeInTheDocument();
    });
  });

  describe('refetching', () => {
    it('refetches memo when memoId changes', async () => {
      vi.mocked(getMemo).mockResolvedValue(mockMemo);
      vi.mocked(getAudioUrl).mockResolvedValue({ audioUrl: 'https://example.com/audio.webm' });

      const { rerender } = render(
        <MemoDetailModal memoId="memo-123" onClose={vi.fn()} />
      );

      await waitFor(() => {
        expect(screen.getByText('Test Memo')).toBeInTheDocument();
      });

      expect(getMemo).toHaveBeenCalledWith('memo-123');

      vi.mocked(getMemo).mockResolvedValue({
        ...mockMemo,
        id: 'memo-456',
        title: 'Another Memo',
      });

      rerender(<MemoDetailModal memoId="memo-456" onClose={vi.fn()} />);

      await waitFor(() => {
        expect(getMemo).toHaveBeenCalledWith('memo-456');
      });
    });
  });
});
