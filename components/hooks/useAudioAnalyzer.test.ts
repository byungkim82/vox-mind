import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAudioAnalyzer } from './useAudioAnalyzer';

describe('useAudioAnalyzer', () => {
  let mockAnalyserNode: {
    fftSize: number;
    frequencyBinCount: number;
    getByteTimeDomainData: ReturnType<typeof vi.fn>;
  };
  let animationFrameCallback: (() => void) | null = null;
  let animationFrameId = 0;

  beforeEach(() => {
    vi.clearAllMocks();

    mockAnalyserNode = {
      fftSize: 2048,
      frequencyBinCount: 1024,
      getByteTimeDomainData: vi.fn().mockImplementation((array: Uint8Array) => {
        // Fill with sample data
        for (let i = 0; i < array.length; i++) {
          array[i] = 128 + Math.floor(Math.sin(i) * 50);
        }
      }),
    };

    // Mock requestAnimationFrame
    vi.stubGlobal('requestAnimationFrame', vi.fn().mockImplementation((cb: () => void) => {
      animationFrameCallback = cb;
      return ++animationFrameId;
    }));

    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    animationFrameCallback = null;
  });

  describe('initial state', () => {
    it('returns null dataArray when analyserNode is null', () => {
      const { result } = renderHook(() => useAudioAnalyzer(null));

      expect(result.current.dataArray).toBeNull();
    });

    it('starts animation frame loop when analyserNode is provided', () => {
      renderHook(() => useAudioAnalyzer(mockAnalyserNode as unknown as AnalyserNode));

      expect(requestAnimationFrame).toHaveBeenCalled();
    });
  });

  describe('data analysis', () => {
    it('calls getByteTimeDomainData on analyserNode', () => {
      renderHook(() => useAudioAnalyzer(mockAnalyserNode as unknown as AnalyserNode));

      // Trigger animation frame
      if (animationFrameCallback) {
        act(() => {
          animationFrameCallback!();
        });
      }

      expect(mockAnalyserNode.getByteTimeDomainData).toHaveBeenCalled();
    });

    it('returns Uint8Array data', () => {
      const { result } = renderHook(() =>
        useAudioAnalyzer(mockAnalyserNode as unknown as AnalyserNode)
      );

      // Trigger animation frame
      if (animationFrameCallback) {
        act(() => {
          animationFrameCallback!();
        });
      }

      expect(result.current.dataArray).toBeInstanceOf(Uint8Array);
    });

    it('creates array with correct length based on frequencyBinCount', () => {
      mockAnalyserNode.frequencyBinCount = 512;

      const { result } = renderHook(() =>
        useAudioAnalyzer(mockAnalyserNode as unknown as AnalyserNode)
      );

      if (animationFrameCallback) {
        act(() => {
          animationFrameCallback!();
        });
      }

      expect(result.current.dataArray?.length).toBe(512);
    });

    it('schedules next animation frame after each update', () => {
      renderHook(() => useAudioAnalyzer(mockAnalyserNode as unknown as AnalyserNode));

      // Initial call
      expect(requestAnimationFrame).toHaveBeenCalledTimes(1);

      // Trigger animation frame
      if (animationFrameCallback) {
        act(() => {
          animationFrameCallback!();
        });
      }

      // Should schedule next frame
      expect(requestAnimationFrame).toHaveBeenCalledTimes(2);
    });
  });

  describe('fftSize option', () => {
    it('uses default fftSize of 2048', () => {
      renderHook(() => useAudioAnalyzer(mockAnalyserNode as unknown as AnalyserNode));

      expect(mockAnalyserNode.fftSize).toBe(2048);
    });

    it('applies custom fftSize from options', () => {
      renderHook(() =>
        useAudioAnalyzer(mockAnalyserNode as unknown as AnalyserNode, { fftSize: 4096 })
      );

      expect(mockAnalyserNode.fftSize).toBe(4096);
    });

    it('updates fftSize when option changes', () => {
      const { rerender } = renderHook(
        ({ fftSize }) =>
          useAudioAnalyzer(mockAnalyserNode as unknown as AnalyserNode, { fftSize }),
        { initialProps: { fftSize: 2048 } }
      );

      expect(mockAnalyserNode.fftSize).toBe(2048);

      rerender({ fftSize: 1024 });

      expect(mockAnalyserNode.fftSize).toBe(1024);
    });
  });

  describe('cleanup', () => {
    it('cancels animation frame on unmount', () => {
      const { unmount } = renderHook(() =>
        useAudioAnalyzer(mockAnalyserNode as unknown as AnalyserNode)
      );

      unmount();

      expect(cancelAnimationFrame).toHaveBeenCalled();
    });

    it('cancels animation frame when analyserNode becomes null', () => {
      const { rerender } = renderHook(
        ({ node }) => useAudioAnalyzer(node),
        { initialProps: { node: mockAnalyserNode as unknown as AnalyserNode } }
      );

      rerender({ node: null as unknown as AnalyserNode });

      expect(cancelAnimationFrame).toHaveBeenCalled();
    });

    it('sets dataArray to null when analyserNode becomes null', () => {
      const { result, rerender } = renderHook(
        ({ node }) => useAudioAnalyzer(node),
        { initialProps: { node: mockAnalyserNode as unknown as AnalyserNode } }
      );

      // Trigger animation frame to get data
      if (animationFrameCallback) {
        act(() => {
          animationFrameCallback!();
        });
      }

      expect(result.current.dataArray).not.toBeNull();

      rerender({ node: null as unknown as AnalyserNode });

      expect(result.current.dataArray).toBeNull();
    });
  });

  describe('analyserNode changes', () => {
    it('restarts animation loop with new analyserNode', () => {
      const newAnalyserNode = {
        fftSize: 2048,
        frequencyBinCount: 512,
        getByteTimeDomainData: vi.fn(),
      };

      const { rerender } = renderHook(
        ({ node }) => useAudioAnalyzer(node),
        { initialProps: { node: mockAnalyserNode as unknown as AnalyserNode } }
      );

      // Clear previous calls
      vi.mocked(requestAnimationFrame).mockClear();
      vi.mocked(cancelAnimationFrame).mockClear();

      rerender({ node: newAnalyserNode as unknown as AnalyserNode });

      // Should cancel old and start new
      expect(cancelAnimationFrame).toHaveBeenCalled();
      expect(requestAnimationFrame).toHaveBeenCalled();
    });
  });
});
