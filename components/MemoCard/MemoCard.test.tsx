import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoCard } from './MemoCard';
import type { MemoSummary, MemoCategory } from '@/lib/types';

const createMockMemo = (overrides: Partial<MemoSummary> = {}): MemoSummary => ({
  id: 'test-id',
  title: 'Test Memo Title',
  summary: 'This is a test summary for the memo',
  category: '개발' as MemoCategory,
  created_at: '2024-01-15T10:00:00',
  updated_at: '2024-01-15T10:00:00',
  ...overrides,
});

describe('MemoCard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockMemo = createMockMemo();

  describe('Rendering', () => {
    it('renders memo title and summary', () => {
      render(<MemoCard memo={mockMemo} />);

      expect(screen.getByText('Test Memo Title')).toBeInTheDocument();
      expect(screen.getByText('This is a test summary for the memo')).toBeInTheDocument();
    });

    it('displays "제목 없음" when title is null', () => {
      render(<MemoCard memo={{ ...mockMemo, title: null }} />);
      expect(screen.getByText('제목 없음')).toBeInTheDocument();
    });

    it('does not render summary when null', () => {
      render(<MemoCard memo={{ ...mockMemo, summary: null }} />);
      expect(screen.queryByText('This is a test summary for the memo')).not.toBeInTheDocument();
    });

    it('shows category badge', () => {
      render(<MemoCard memo={mockMemo} />);
      expect(screen.getByText('개발')).toBeInTheDocument();
    });

    it('defaults to "기타" category when category is null', () => {
      render(<MemoCard memo={{ ...mockMemo, category: null }} />);
      expect(screen.getByText('기타')).toBeInTheDocument();
    });
  });

  describe('Date formatting', () => {
    it('shows "오늘" for today\'s memo', () => {
      render(<MemoCard memo={{ ...mockMemo, created_at: '2024-01-15T10:00:00' }} />);
      expect(screen.getByText('오늘')).toBeInTheDocument();
    });

    it('shows "어제" for yesterday\'s memo', () => {
      render(<MemoCard memo={{ ...mockMemo, created_at: '2024-01-14T10:00:00' }} />);
      expect(screen.getByText('어제')).toBeInTheDocument();
    });

    it('shows "N일 전" for memos within a week', () => {
      render(<MemoCard memo={{ ...mockMemo, created_at: '2024-01-12T10:00:00' }} />);
      expect(screen.getByText('3일 전')).toBeInTheDocument();
    });
  });

  describe('Click behavior', () => {
    it('calls onClick when card is clicked', () => {
      const onClick = vi.fn();
      render(<MemoCard memo={mockMemo} onClick={onClick} />);

      // Card is now a div with role="button", not a button element
      const card = screen.getByRole('button', { name: /test memo title/i });
      fireEvent.click(card);

      expect(onClick).toHaveBeenCalledWith('test-id');
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('does not throw when onClick is not provided', () => {
      render(<MemoCard memo={mockMemo} />);

      const card = screen.getByRole('button', { name: /test memo title/i });
      expect(() => fireEvent.click(card)).not.toThrow();
    });

    it('supports keyboard navigation with Enter key', () => {
      const onClick = vi.fn();
      render(<MemoCard memo={mockMemo} onClick={onClick} />);

      const card = screen.getByRole('button', { name: /test memo title/i });
      fireEvent.keyDown(card, { key: 'Enter' });

      expect(onClick).toHaveBeenCalledWith('test-id');
    });

    it('supports keyboard navigation with Space key', () => {
      const onClick = vi.fn();
      render(<MemoCard memo={mockMemo} onClick={onClick} />);

      const card = screen.getByRole('button', { name: /test memo title/i });
      fireEvent.keyDown(card, { key: ' ' });

      expect(onClick).toHaveBeenCalledWith('test-id');
    });
  });

  describe('Delete functionality', () => {
    it('does not show delete button when onDelete is not provided', () => {
      render(<MemoCard memo={mockMemo} />);
      expect(screen.queryByLabelText('메모 삭제')).not.toBeInTheDocument();
    });

    it('shows delete button when onDelete is provided', () => {
      const onDelete = vi.fn();
      render(<MemoCard memo={mockMemo} onDelete={onDelete} />);
      expect(screen.getByLabelText('메모 삭제')).toBeInTheDocument();
    });

    it('shows delete confirmation on delete button click', () => {
      const onDelete = vi.fn();
      render(<MemoCard memo={mockMemo} onDelete={onDelete} />);

      fireEvent.click(screen.getByLabelText('메모 삭제'));

      expect(screen.getByText('삭제할까요?')).toBeInTheDocument();
      expect(screen.getByText('삭제')).toBeInTheDocument();
      expect(screen.getByText('취소')).toBeInTheDocument();
    });

    it('calls onDelete after confirmation', async () => {
      vi.useRealTimers(); // Use real timers for async test
      const onDelete = vi.fn().mockResolvedValue(undefined);
      render(<MemoCard memo={createMockMemo()} onDelete={onDelete} />);

      fireEvent.click(screen.getByLabelText('메모 삭제'));
      fireEvent.click(screen.getByText('삭제'));

      await waitFor(() => {
        expect(onDelete).toHaveBeenCalledWith('test-id');
      });
    });

    it('hides confirmation when cancel is clicked', () => {
      const onDelete = vi.fn();
      render(<MemoCard memo={mockMemo} onDelete={onDelete} />);

      fireEvent.click(screen.getByLabelText('메모 삭제'));
      expect(screen.getByText('삭제할까요?')).toBeInTheDocument();

      fireEvent.click(screen.getByText('취소'));
      expect(screen.queryByText('삭제할까요?')).not.toBeInTheDocument();
      expect(onDelete).not.toHaveBeenCalled();
    });

    it('prevents click event from bubbling during delete flow', () => {
      const onClick = vi.fn();
      const onDelete = vi.fn().mockResolvedValue(undefined);
      render(<MemoCard memo={mockMemo} onClick={onClick} onDelete={onDelete} />);

      fireEvent.click(screen.getByLabelText('메모 삭제'));

      // onClick should not be called when clicking delete button
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('Category styles', () => {
    it('applies purple color for 개발 category', () => {
      render(<MemoCard memo={{ ...mockMemo, category: '개발' }} />);
      const badge = screen.getByText('개발');
      expect(badge.className).toContain('purple');
    });

    it('applies blue color for 업무 category', () => {
      render(<MemoCard memo={{ ...mockMemo, category: '업무' }} />);
      const badge = screen.getByText('업무');
      expect(badge.className).toContain('blue');
    });

    it('applies gray color for 기타 category', () => {
      render(<MemoCard memo={{ ...mockMemo, category: '기타' }} />);
      const badge = screen.getByText('기타');
      expect(badge.className).toContain('gray');
    });
  });
});
