import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toast } from './Toast';
import type { Toast as ToastType } from '@/lib/types';

describe('Toast', () => {
  const mockOnDismiss = vi.fn();

  const createToast = (overrides: Partial<ToastType> = {}): ToastType => ({
    id: 'toast-1',
    type: 'success',
    message: 'Test message',
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders toast message', () => {
      render(<Toast toast={createToast({ message: 'Hello World' })} onDismiss={mockOnDismiss} />);

      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('renders with role="alert"', () => {
      render(<Toast toast={createToast()} onDismiss={mockOnDismiss} />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('renders dismiss button with aria-label', () => {
      render(<Toast toast={createToast()} onDismiss={mockOnDismiss} />);

      expect(screen.getByRole('button', { name: '닫기' })).toBeInTheDocument();
    });
  });

  describe('toast types', () => {
    it('renders success toast with green styling', () => {
      render(<Toast toast={createToast({ type: 'success' })} onDismiss={mockOnDismiss} />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('border-green-500');
      expect(alert).toHaveClass('text-green-400');
    });

    it('renders error toast with red styling', () => {
      render(<Toast toast={createToast({ type: 'error' })} onDismiss={mockOnDismiss} />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('border-red-500');
      expect(alert).toHaveClass('text-red-400');
    });

    it('renders info toast with primary styling', () => {
      render(<Toast toast={createToast({ type: 'info' })} onDismiss={mockOnDismiss} />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('border-primary');
      expect(alert).toHaveClass('text-primary');
    });
  });

  describe('icons', () => {
    it('renders success icon (checkmark)', () => {
      render(<Toast toast={createToast({ type: 'success' })} onDismiss={mockOnDismiss} />);

      const svg = screen.getByRole('alert').querySelector('svg.text-green-400');
      expect(svg).toBeInTheDocument();
    });

    it('renders error icon (x circle)', () => {
      render(<Toast toast={createToast({ type: 'error' })} onDismiss={mockOnDismiss} />);

      const svg = screen.getByRole('alert').querySelector('svg.text-red-400');
      expect(svg).toBeInTheDocument();
    });

    it('renders info icon (info circle)', () => {
      render(<Toast toast={createToast({ type: 'info' })} onDismiss={mockOnDismiss} />);

      const svg = screen.getByRole('alert').querySelector('svg.text-primary');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('calls onDismiss with toast id when dismiss button is clicked', () => {
      render(
        <Toast toast={createToast({ id: 'my-toast-id' })} onDismiss={mockOnDismiss} />
      );

      const dismissButton = screen.getByRole('button', { name: '닫기' });
      fireEvent.click(dismissButton);

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
      expect(mockOnDismiss).toHaveBeenCalledWith('my-toast-id');
    });

    it('does not call onDismiss on initial render', () => {
      render(<Toast toast={createToast()} onDismiss={mockOnDismiss} />);

      expect(mockOnDismiss).not.toHaveBeenCalled();
    });
  });

  describe('styling', () => {
    it('applies animation class', () => {
      render(<Toast toast={createToast()} onDismiss={mockOnDismiss} />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('animate-slide-in-right');
    });

    it('applies common styling classes', () => {
      render(<Toast toast={createToast()} onDismiss={mockOnDismiss} />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('rounded-xl');
      expect(alert).toHaveClass('shadow-2xl');
      expect(alert).toHaveClass('border-l-4');
    });
  });

  describe('message display', () => {
    it('displays long messages', () => {
      const longMessage = 'This is a very long message that should still be displayed correctly in the toast notification component';
      render(<Toast toast={createToast({ message: longMessage })} onDismiss={mockOnDismiss} />);

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('displays messages with special characters', () => {
      const specialMessage = '성공! 메모가 저장되었습니다. 🎉';
      render(<Toast toast={createToast({ message: specialMessage })} onDismiss={mockOnDismiss} />);

      expect(screen.getByText(specialMessage)).toBeInTheDocument();
    });
  });
});
