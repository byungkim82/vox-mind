import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecordButton } from './RecordButton';

describe('RecordButton', () => {
  const mockOnClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders a button', () => {
      render(
        <RecordButton isRecording={false} isProcessing={false} onClick={mockOnClick} />
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('renders start recording label when not recording', () => {
      render(
        <RecordButton isRecording={false} isProcessing={false} onClick={mockOnClick} />
      );

      expect(screen.getByText('녹음 시작')).toBeInTheDocument();
    });

    it('renders stop recording label when recording', () => {
      render(
        <RecordButton isRecording={true} isProcessing={false} onClick={mockOnClick} />
      );

      expect(screen.getByText('녹음 종료')).toBeInTheDocument();
    });
  });

  describe('aria labels', () => {
    it('has "녹음 시작" aria-label when not recording', () => {
      render(
        <RecordButton isRecording={false} isProcessing={false} onClick={mockOnClick} />
      );

      expect(screen.getByRole('button', { name: '녹음 시작' })).toBeInTheDocument();
    });

    it('has "녹음 중지" aria-label when recording', () => {
      render(
        <RecordButton isRecording={true} isProcessing={false} onClick={mockOnClick} />
      );

      expect(screen.getByRole('button', { name: '녹음 중지' })).toBeInTheDocument();
    });
  });

  describe('icons', () => {
    it('shows microphone icon when not recording', () => {
      render(
        <RecordButton isRecording={false} isProcessing={false} onClick={mockOnClick} />
      );

      const button = screen.getByRole('button');
      const svg = button.querySelector('svg');
      expect(svg).toBeInTheDocument();
      // Check for path element (mic icon has path, not rect)
      expect(svg?.querySelector('path')).toBeInTheDocument();
    });

    it('shows stop icon (square) when recording', () => {
      render(
        <RecordButton isRecording={true} isProcessing={false} onClick={mockOnClick} />
      );

      const button = screen.getByRole('button');
      const svg = button.querySelector('svg');
      expect(svg).toBeInTheDocument();
      // Check for rect element (stop icon has rect)
      expect(svg?.querySelector('rect')).toBeInTheDocument();
    });

    it('shows spinner when processing', () => {
      render(
        <RecordButton isRecording={false} isProcessing={true} onClick={mockOnClick} />
      );

      const button = screen.getByRole('button');
      const svg = button.querySelector('svg.animate-spin');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('calls onClick when clicked', () => {
      render(
        <RecordButton isRecording={false} isProcessing={false} onClick={mockOnClick} />
      );

      fireEvent.click(screen.getByRole('button'));

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('calls onClick when recording and clicked', () => {
      render(
        <RecordButton isRecording={true} isProcessing={false} onClick={mockOnClick} />
      );

      fireEvent.click(screen.getByRole('button'));

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('disabled state', () => {
    it('is not disabled by default', () => {
      render(
        <RecordButton isRecording={false} isProcessing={false} onClick={mockOnClick} />
      );

      expect(screen.getByRole('button')).not.toBeDisabled();
    });

    it('is disabled when disabled prop is true', () => {
      render(
        <RecordButton
          isRecording={false}
          isProcessing={false}
          onClick={mockOnClick}
          disabled={true}
        />
      );

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('does not call onClick when disabled', () => {
      render(
        <RecordButton
          isRecording={false}
          isProcessing={false}
          onClick={mockOnClick}
          disabled={true}
        />
      );

      fireEvent.click(screen.getByRole('button'));

      expect(mockOnClick).not.toHaveBeenCalled();
    });

    it('has opacity styling when disabled', () => {
      render(
        <RecordButton
          isRecording={false}
          isProcessing={false}
          onClick={mockOnClick}
          disabled={true}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('opacity-50');
      expect(button).toHaveClass('cursor-not-allowed');
    });
  });

  describe('styling', () => {
    it('has proper button size', () => {
      render(
        <RecordButton isRecording={false} isProcessing={false} onClick={mockOnClick} />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('w-20');
      expect(button).toHaveClass('h-20');
    });

    it('has rounded-full class', () => {
      render(
        <RecordButton isRecording={false} isProcessing={false} onClick={mockOnClick} />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('rounded-full');
    });

    it('has hover effect when not disabled', () => {
      render(
        <RecordButton isRecording={false} isProcessing={false} onClick={mockOnClick} />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('hover:scale-105');
    });

    it('has focus ring', () => {
      render(
        <RecordButton isRecording={false} isProcessing={false} onClick={mockOnClick} />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('focus:ring-4');
    });
  });

  describe('glow effect', () => {
    it('has glow container', () => {
      const { container } = render(
        <RecordButton isRecording={false} isProcessing={false} onClick={mockOnClick} />
      );

      const glowDiv = container.querySelector('.blur');
      expect(glowDiv).toBeInTheDocument();
    });

    it('shows active glow when recording', () => {
      const { container } = render(
        <RecordButton isRecording={true} isProcessing={false} onClick={mockOnClick} />
      );

      const glowDiv = container.querySelector('.blur');
      expect(glowDiv).toHaveClass('opacity-60');
    });
  });

  describe('processing state', () => {
    it('shows spinner icon when processing', () => {
      render(
        <RecordButton isRecording={false} isProcessing={true} onClick={mockOnClick} />
      );

      const button = screen.getByRole('button');
      const spinner = button.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('prioritizes processing state over recording state', () => {
      render(
        <RecordButton isRecording={true} isProcessing={true} onClick={mockOnClick} />
      );

      const button = screen.getByRole('button');
      // Should show spinner, not stop icon
      expect(button.querySelector('.animate-spin')).toBeInTheDocument();
      expect(button.querySelector('rect')).not.toBeInTheDocument();
    });
  });
});
