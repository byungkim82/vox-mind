import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Timer } from './Timer';

describe('Timer', () => {
  describe('rendering', () => {
    it('renders the time display', () => {
      render(<Timer time="00:00" isRecording={false} />);

      expect(screen.getByText('00:00')).toBeInTheDocument();
    });

    it('renders the "Recording Time" label', () => {
      render(<Timer time="00:00" isRecording={false} />);

      expect(screen.getByText('Recording Time')).toBeInTheDocument();
    });
  });

  describe('time display', () => {
    it('displays formatted time correctly', () => {
      render(<Timer time="01:30" isRecording={false} />);

      expect(screen.getByText('01:30')).toBeInTheDocument();
    });

    it('displays double digit minutes', () => {
      render(<Timer time="15:45" isRecording={false} />);

      expect(screen.getByText('15:45')).toBeInTheDocument();
    });

    it('displays long durations', () => {
      render(<Timer time="99:59" isRecording={false} />);

      expect(screen.getByText('99:59')).toBeInTheDocument();
    });
  });

  describe('recording indicator', () => {
    it('shows red pulse indicator when recording', () => {
      const { container } = render(<Timer time="00:00" isRecording={true} />);

      const indicator = container.querySelector('.bg-red-500');
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveClass('animate-pulse');
    });

    it('hides pulse indicator when not recording', () => {
      const { container } = render(<Timer time="00:00" isRecording={false} />);

      const indicator = container.querySelector('.bg-red-500');
      expect(indicator).not.toBeInTheDocument();
    });

    it('indicator has rounded shape', () => {
      const { container } = render(<Timer time="00:00" isRecording={true} />);

      const indicator = container.querySelector('.bg-red-500');
      expect(indicator).toHaveClass('rounded-full');
    });

    it('indicator has proper size', () => {
      const { container } = render(<Timer time="00:00" isRecording={true} />);

      const indicator = container.querySelector('.bg-red-500');
      expect(indicator).toHaveClass('w-3');
      expect(indicator).toHaveClass('h-3');
    });
  });

  describe('text styling', () => {
    it('has white text when recording', () => {
      render(<Timer time="00:00" isRecording={true} />);

      const timeDisplay = screen.getByText('00:00');
      expect(timeDisplay).toHaveClass('text-white');
    });

    it('has secondary text color when not recording', () => {
      render(<Timer time="00:00" isRecording={false} />);

      const timeDisplay = screen.getByText('00:00');
      expect(timeDisplay).toHaveClass('text-text-secondary');
    });

    it('has large font size', () => {
      render(<Timer time="00:00" isRecording={false} />);

      const timeDisplay = screen.getByText('00:00');
      expect(timeDisplay).toHaveClass('text-5xl');
    });

    it('has responsive font size for larger screens', () => {
      render(<Timer time="00:00" isRecording={false} />);

      const timeDisplay = screen.getByText('00:00');
      expect(timeDisplay).toHaveClass('sm:text-7xl');
    });

    it('uses tabular nums for consistent width', () => {
      render(<Timer time="00:00" isRecording={false} />);

      const timeDisplay = screen.getByText('00:00');
      expect(timeDisplay).toHaveClass('tabular-nums');
    });

    it('has bold font weight', () => {
      render(<Timer time="00:00" isRecording={false} />);

      const timeDisplay = screen.getByText('00:00');
      expect(timeDisplay).toHaveClass('font-bold');
    });
  });

  describe('label styling', () => {
    it('label has secondary text color', () => {
      render(<Timer time="00:00" isRecording={false} />);

      const label = screen.getByText('Recording Time');
      expect(label).toHaveClass('text-text-secondary');
    });

    it('label has small font size', () => {
      render(<Timer time="00:00" isRecording={false} />);

      const label = screen.getByText('Recording Time');
      expect(label).toHaveClass('text-sm');
    });

    it('label has uppercase styling', () => {
      render(<Timer time="00:00" isRecording={false} />);

      const label = screen.getByText('Recording Time');
      expect(label).toHaveClass('uppercase');
    });

    it('label has tracking-widest for letter spacing', () => {
      render(<Timer time="00:00" isRecording={false} />);

      const label = screen.getByText('Recording Time');
      expect(label).toHaveClass('tracking-widest');
    });
  });

  describe('layout', () => {
    it('has flex column layout', () => {
      const { container } = render(<Timer time="00:00" isRecording={false} />);

      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass('flex');
      expect(mainContainer).toHaveClass('flex-col');
    });

    it('has centered items', () => {
      const { container } = render(<Timer time="00:00" isRecording={false} />);

      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass('items-center');
    });

    it('has gap between elements', () => {
      const { container } = render(<Timer time="00:00" isRecording={false} />);

      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass('gap-2');
    });
  });

  describe('time and indicator container', () => {
    it('has flex layout for time and indicator', () => {
      const { container } = render(<Timer time="00:00" isRecording={true} />);

      const timeContainer = screen.getByText('00:00').parentElement;
      expect(timeContainer).toHaveClass('flex');
      expect(timeContainer).toHaveClass('items-center');
    });

    it('has gap between indicator and time', () => {
      const { container } = render(<Timer time="00:00" isRecording={true} />);

      const timeContainer = screen.getByText('00:00').parentElement;
      expect(timeContainer).toHaveClass('gap-3');
    });
  });
});
