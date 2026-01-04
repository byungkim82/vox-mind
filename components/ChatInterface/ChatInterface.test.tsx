import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ChatInterface } from './ChatInterface';

// Mock crypto.randomUUID
let uuidCounter = 0;
vi.stubGlobal('crypto', {
  randomUUID: () => `test-uuid-${++uuidCounter}`,
});

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Mock API client
vi.mock('@/lib/api/client', () => ({
  sendChatMessage: vi.fn(),
}));

// Mock MemoDetailModal
vi.mock('@/components/MemoDetailModal', () => ({
  MemoDetailModal: ({ memoId, onClose }: any) =>
    memoId ? (
      <div data-testid="memo-detail-modal">
        <span>Modal for {memoId}</span>
        <button onClick={onClose} data-testid="close-modal">
          Close
        </button>
      </div>
    ) : null,
}));

import { sendChatMessage } from '@/lib/api/client';

describe('ChatInterface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uuidCounter = 0;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('rendering', () => {
    it('renders empty state initially', () => {
      render(<ChatInterface />);

      expect(screen.getByText('메모에 대해 물어보세요')).toBeInTheDocument();
      expect(screen.getByText(/지난주 개발 아이디어가 뭐였지/)).toBeInTheDocument();
    });

    it('renders input field', () => {
      render(<ChatInterface />);

      expect(screen.getByPlaceholderText('메모에 대해 질문하세요...')).toBeInTheDocument();
    });

    it('renders submit button', () => {
      render(<ChatInterface />);

      expect(screen.getByRole('button', { name: '' })).toBeInTheDocument();
    });

    it('renders disclaimer text', () => {
      render(<ChatInterface />);

      expect(
        screen.getByText(/AI 답변은 정확하지 않을 수 있습니다/)
      ).toBeInTheDocument();
    });
  });

  describe('message submission', () => {
    it('sends message when form is submitted', async () => {
      vi.mocked(sendChatMessage).mockResolvedValue({
        answer: 'Here is the answer based on your memos.',
        sources: [],
      });

      render(<ChatInterface />);

      const input = screen.getByPlaceholderText('메모에 대해 질문하세요...');
      const submitButton = screen.getByRole('button');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'What was discussed?' } });
      });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(sendChatMessage).toHaveBeenCalledWith('What was discussed?');
      });
    });

    it('sends message on Enter key', async () => {
      vi.mocked(sendChatMessage).mockResolvedValue({
        answer: 'Answer',
        sources: [],
      });

      render(<ChatInterface />);

      const input = screen.getByPlaceholderText('메모에 대해 질문하세요...');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Test question' } });
      });

      await act(async () => {
        fireEvent.keyDown(input, { key: 'Enter' });
      });

      await waitFor(() => {
        expect(sendChatMessage).toHaveBeenCalledWith('Test question');
      });
    });

    it('does not send on Shift+Enter', async () => {
      render(<ChatInterface />);

      const input = screen.getByPlaceholderText('메모에 대해 질문하세요...');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Test' } });
      });

      await act(async () => {
        fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
      });

      expect(sendChatMessage).not.toHaveBeenCalled();
    });

    it('clears input after sending', async () => {
      vi.mocked(sendChatMessage).mockResolvedValue({
        answer: 'Answer',
        sources: [],
      });

      render(<ChatInterface />);

      const input = screen.getByPlaceholderText('메모에 대해 질문하세요...');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Test question' } });
      });

      await act(async () => {
        fireEvent.keyDown(input, { key: 'Enter' });
      });

      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });

    it('does not send empty message', async () => {
      render(<ChatInterface />);

      const input = screen.getByPlaceholderText('메모에 대해 질문하세요...');
      const submitButton = screen.getByRole('button');

      await act(async () => {
        fireEvent.change(input, { target: { value: '   ' } });
      });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      expect(sendChatMessage).not.toHaveBeenCalled();
    });

    it('disables submit button when input is empty', () => {
      render(<ChatInterface />);

      const submitButton = screen.getByRole('button');
      expect(submitButton).toBeDisabled();
    });

    it('enables submit button when input has text', async () => {
      render(<ChatInterface />);

      const input = screen.getByPlaceholderText('메모에 대해 질문하세요...');
      const submitButton = screen.getByRole('button');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Hello' } });
      });

      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('message display', () => {
    it('displays user message', async () => {
      vi.mocked(sendChatMessage).mockResolvedValue({
        answer: 'Response',
        sources: [],
      });

      render(<ChatInterface />);

      const input = screen.getByPlaceholderText('메모에 대해 질문하세요...');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'My question' } });
        fireEvent.keyDown(input, { key: 'Enter' });
      });

      await waitFor(() => {
        expect(screen.getByText('My question')).toBeInTheDocument();
      });
    });

    it('displays assistant response', async () => {
      vi.mocked(sendChatMessage).mockResolvedValue({
        answer: 'This is the AI response.',
        sources: [],
      });

      render(<ChatInterface />);

      const input = screen.getByPlaceholderText('메모에 대해 질문하세요...');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Question' } });
        fireEvent.keyDown(input, { key: 'Enter' });
      });

      await waitFor(() => {
        expect(screen.getByText('This is the AI response.')).toBeInTheDocument();
      });
    });

    it('displays error message on failure', async () => {
      vi.mocked(sendChatMessage).mockRejectedValue(new Error('API Error'));

      render(<ChatInterface />);

      const input = screen.getByPlaceholderText('메모에 대해 질문하세요...');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Question' } });
        fireEvent.keyDown(input, { key: 'Enter' });
      });

      await waitFor(() => {
        expect(screen.getByText('API Error')).toBeInTheDocument();
      });
    });

    it('displays generic error for non-Error throws', async () => {
      vi.mocked(sendChatMessage).mockRejectedValue('Unknown error');

      render(<ChatInterface />);

      const input = screen.getByPlaceholderText('메모에 대해 질문하세요...');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Question' } });
        fireEvent.keyDown(input, { key: 'Enter' });
      });

      await waitFor(() => {
        expect(screen.getByText('오류가 발생했습니다.')).toBeInTheDocument();
      });
    });
  });

  describe('loading state', () => {
    it('shows loading indicator while waiting for response', async () => {
      vi.mocked(sendChatMessage).mockImplementation(() => new Promise(() => {}));

      render(<ChatInterface />);

      const input = screen.getByPlaceholderText('메모에 대해 질문하세요...');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Question' } });
        fireEvent.keyDown(input, { key: 'Enter' });
      });

      // Loading indicator (bouncing dots)
      expect(document.querySelectorAll('.animate-bounce').length).toBe(3);
    });

    it('disables input while loading', async () => {
      vi.mocked(sendChatMessage).mockImplementation(() => new Promise(() => {}));

      render(<ChatInterface />);

      const input = screen.getByPlaceholderText('메모에 대해 질문하세요...');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Question' } });
        fireEvent.keyDown(input, { key: 'Enter' });
      });

      expect(input).toBeDisabled();
    });
  });

  describe('sources', () => {
    it('displays sources with response', async () => {
      vi.mocked(sendChatMessage).mockResolvedValue({
        answer: 'Here is the answer.',
        sources: [
          {
            id: 'memo-1',
            title: 'Meeting Notes',
            summary: 'Discussed project timeline',
            category: '업무',
            created_at: '2024-01-15T10:00:00Z',
          },
          {
            id: 'memo-2',
            title: 'Ideas',
            summary: 'New feature ideas',
            category: '아이디어',
            created_at: '2024-01-14T10:00:00Z',
          },
        ],
      });

      render(<ChatInterface />);

      const input = screen.getByPlaceholderText('메모에 대해 질문하세요...');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Question' } });
        fireEvent.keyDown(input, { key: 'Enter' });
      });

      await waitFor(() => {
        expect(screen.getByText('Meeting Notes')).toBeInTheDocument();
        expect(screen.getByText('Ideas')).toBeInTheDocument();
        expect(screen.getByText('관련 메모')).toBeInTheDocument();
      });
    });

    it('opens memo modal when source is clicked', async () => {
      vi.mocked(sendChatMessage).mockResolvedValue({
        answer: 'Answer',
        sources: [
          {
            id: 'memo-1',
            title: 'Test Memo',
            summary: 'Summary',
            category: '개발',
            created_at: '2024-01-15T10:00:00Z',
          },
        ],
      });

      render(<ChatInterface />);

      const input = screen.getByPlaceholderText('메모에 대해 질문하세요...');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Question' } });
        fireEvent.keyDown(input, { key: 'Enter' });
      });

      await waitFor(() => {
        expect(screen.getByText('Test Memo')).toBeInTheDocument();
      });

      const sourceCard = screen.getByText('Test Memo').closest('button');
      await act(async () => {
        fireEvent.click(sourceCard!);
      });

      expect(screen.getByTestId('memo-detail-modal')).toBeInTheDocument();
      expect(screen.getByText('Modal for memo-1')).toBeInTheDocument();
    });

    it('closes modal when close is triggered', async () => {
      vi.mocked(sendChatMessage).mockResolvedValue({
        answer: 'Answer',
        sources: [
          {
            id: 'memo-1',
            title: 'Test Memo',
            summary: 'Summary',
            category: '개발',
            created_at: '2024-01-15T10:00:00Z',
          },
        ],
      });

      render(<ChatInterface />);

      const input = screen.getByPlaceholderText('메모에 대해 질문하세요...');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Question' } });
        fireEvent.keyDown(input, { key: 'Enter' });
      });

      await waitFor(() => {
        expect(screen.getByText('Test Memo')).toBeInTheDocument();
      });

      const sourceCard = screen.getByText('Test Memo').closest('button');
      await act(async () => {
        fireEvent.click(sourceCard!);
      });

      const closeButton = screen.getByTestId('close-modal');
      await act(async () => {
        fireEvent.click(closeButton);
      });

      expect(screen.queryByTestId('memo-detail-modal')).not.toBeInTheDocument();
    });
  });

  describe('clear conversation', () => {
    it('shows clear button when there are messages', async () => {
      vi.mocked(sendChatMessage).mockResolvedValue({
        answer: 'Answer',
        sources: [],
      });

      render(<ChatInterface />);

      // Initially no clear button
      expect(screen.queryByText('대화 초기화')).not.toBeInTheDocument();

      const input = screen.getByPlaceholderText('메모에 대해 질문하세요...');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Question' } });
        fireEvent.keyDown(input, { key: 'Enter' });
      });

      await waitFor(() => {
        expect(screen.getByText('대화 초기화')).toBeInTheDocument();
      });
    });

    it('clears messages when clear button is clicked', async () => {
      vi.mocked(sendChatMessage).mockResolvedValue({
        answer: 'Answer',
        sources: [],
      });

      render(<ChatInterface />);

      const input = screen.getByPlaceholderText('메모에 대해 질문하세요...');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Question' } });
        fireEvent.keyDown(input, { key: 'Enter' });
      });

      await waitFor(() => {
        expect(screen.getByText('Answer')).toBeInTheDocument();
      });

      const clearButton = screen.getByText('대화 초기화');
      await act(async () => {
        fireEvent.click(clearButton);
      });

      expect(screen.queryByText('Answer')).not.toBeInTheDocument();
      expect(screen.getByText('메모에 대해 물어보세요')).toBeInTheDocument();
    });
  });

  describe('multiple messages', () => {
    it('maintains conversation history', async () => {
      vi.mocked(sendChatMessage)
        .mockResolvedValueOnce({ answer: 'First answer', sources: [] })
        .mockResolvedValueOnce({ answer: 'Second answer', sources: [] });

      render(<ChatInterface />);

      const input = screen.getByPlaceholderText('메모에 대해 질문하세요...');

      // First message
      await act(async () => {
        fireEvent.change(input, { target: { value: 'First question' } });
        fireEvent.keyDown(input, { key: 'Enter' });
      });

      await waitFor(() => {
        expect(screen.getByText('First answer')).toBeInTheDocument();
      });

      // Second message
      await act(async () => {
        fireEvent.change(input, { target: { value: 'Second question' } });
        fireEvent.keyDown(input, { key: 'Enter' });
      });

      await waitFor(() => {
        expect(screen.getByText('First question')).toBeInTheDocument();
        expect(screen.getByText('First answer')).toBeInTheDocument();
        expect(screen.getByText('Second question')).toBeInTheDocument();
        expect(screen.getByText('Second answer')).toBeInTheDocument();
      });
    });
  });
});
