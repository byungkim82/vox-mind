import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimer } from './useTimer';

describe('useTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('returns 0 elapsed seconds initially', () => {
      const { result } = renderHook(() => useTimer(false));

      expect(result.current.elapsedSeconds).toBe(0);
    });

    it('returns formatted time of 00:00 initially', () => {
      const { result } = renderHook(() => useTimer(false));

      expect(result.current.formattedTime).toBe('00:00');
    });
  });

  describe('timer behavior', () => {
    it('starts counting when isRunning becomes true', () => {
      const { result, rerender } = renderHook(
        ({ isRunning }) => useTimer(isRunning),
        { initialProps: { isRunning: false } }
      );

      expect(result.current.elapsedSeconds).toBe(0);

      rerender({ isRunning: true });

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.elapsedSeconds).toBe(1);
    });

    it('increments every second', () => {
      const { result } = renderHook(() => useTimer(true));

      expect(result.current.elapsedSeconds).toBe(0);

      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(result.current.elapsedSeconds).toBe(1);

      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(result.current.elapsedSeconds).toBe(2);

      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(result.current.elapsedSeconds).toBe(3);
    });

    it('stops counting when isRunning becomes false', () => {
      const { result, rerender } = renderHook(
        ({ isRunning }) => useTimer(isRunning),
        { initialProps: { isRunning: true } }
      );

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.elapsedSeconds).toBe(5);

      rerender({ isRunning: false });

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Should stay at 5, not increase
      expect(result.current.elapsedSeconds).toBe(5);
    });

    it('resets to 0 when restarted', () => {
      const { result, rerender } = renderHook(
        ({ isRunning }) => useTimer(isRunning),
        { initialProps: { isRunning: true } }
      );

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.elapsedSeconds).toBe(5);

      rerender({ isRunning: false });
      rerender({ isRunning: true });

      expect(result.current.elapsedSeconds).toBe(0);
    });
  });

  describe('formattedTime', () => {
    it('formats seconds correctly', () => {
      const { result } = renderHook(() => useTimer(true));

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.formattedTime).toBe('00:05');
    });

    it('formats minutes correctly', () => {
      const { result } = renderHook(() => useTimer(true));

      act(() => {
        vi.advanceTimersByTime(65000); // 1 minute 5 seconds
      });

      expect(result.current.formattedTime).toBe('01:05');
    });

    it('formats double digit seconds', () => {
      const { result } = renderHook(() => useTimer(true));

      act(() => {
        vi.advanceTimersByTime(45000); // 45 seconds
      });

      expect(result.current.formattedTime).toBe('00:45');
    });

    it('formats double digit minutes', () => {
      const { result } = renderHook(() => useTimer(true));

      act(() => {
        vi.advanceTimersByTime(15 * 60 * 1000 + 30000); // 15:30
      });

      expect(result.current.formattedTime).toBe('15:30');
    });

    it('handles hour+ durations', () => {
      const { result } = renderHook(() => useTimer(true));

      act(() => {
        vi.advanceTimersByTime(75 * 60 * 1000); // 75 minutes
      });

      expect(result.current.formattedTime).toBe('75:00');
    });

    it('pads single digits with zeros', () => {
      const { result } = renderHook(() => useTimer(true));

      act(() => {
        vi.advanceTimersByTime(3000); // 3 seconds
      });

      expect(result.current.formattedTime).toBe('00:03');

      act(() => {
        vi.advanceTimersByTime(60000); // 1 minute 3 seconds total
      });

      expect(result.current.formattedTime).toBe('01:03');
    });
  });

  describe('edge cases', () => {
    it('handles starting with isRunning true', () => {
      const { result } = renderHook(() => useTimer(true));

      // Initial state should be 0
      expect(result.current.elapsedSeconds).toBe(0);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.elapsedSeconds).toBe(1);
    });

    it('handles rapid toggle', () => {
      const { result, rerender } = renderHook(
        ({ isRunning }) => useTimer(isRunning),
        { initialProps: { isRunning: false } }
      );

      rerender({ isRunning: true });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      rerender({ isRunning: false });
      rerender({ isRunning: true });

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Should be reset to 0 and count 1 second
      expect(result.current.elapsedSeconds).toBe(1);
    });
  });

  describe('cleanup', () => {
    it('clears interval on unmount', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      const { unmount } = renderHook(() => useTimer(true));

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('clears interval when isRunning changes to false', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      const { rerender } = renderHook(
        ({ isRunning }) => useTimer(isRunning),
        { initialProps: { isRunning: true } }
      );

      rerender({ isRunning: false });

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });
});
