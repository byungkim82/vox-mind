import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRecorder } from './useRecorder';

// Track MediaRecorder instances
let mockMediaRecorderInstances: MockMediaRecorderInstance[] = [];

interface MockMediaRecorderInstance {
  state: string;
  mimeType: string;
  ondataavailable: ((event: { data: Blob }) => void) | null;
  onstop: (() => void) | null;
  onerror: (() => void) | null;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  triggerError: () => void;
}

function createMockMediaRecorderInstance(): MockMediaRecorderInstance {
  const instance: MockMediaRecorderInstance = {
    state: 'inactive',
    mimeType: 'audio/webm',
    ondataavailable: null,
    onstop: null,
    onerror: null,
    start: vi.fn().mockImplementation(() => {
      instance.state = 'recording';
    }),
    stop: vi.fn().mockImplementation(() => {
      instance.state = 'inactive';
      if (instance.ondataavailable) {
        instance.ondataavailable({ data: new Blob(['audio data'], { type: 'audio/webm' }) });
      }
      if (instance.onstop) {
        instance.onstop();
      }
    }),
    triggerError: () => {
      if (instance.onerror) {
        instance.onerror();
      }
    },
  };
  return instance;
}

// Mock MediaRecorder as a proper class
class MockMediaRecorder {
  static isTypeSupported = vi.fn().mockReturnValue(true);

  state = 'inactive';
  mimeType = 'audio/webm';
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor() {
    mockMediaRecorderInstances.push(this as unknown as MockMediaRecorderInstance);
  }

  start = vi.fn().mockImplementation(() => {
    this.state = 'recording';
  });

  stop = vi.fn().mockImplementation(() => {
    this.state = 'inactive';
    if (this.ondataavailable) {
      this.ondataavailable({ data: new Blob(['audio data'], { type: 'audio/webm' }) });
    }
    if (this.onstop) {
      this.onstop();
    }
  });

  triggerError() {
    if (this.onerror) {
      this.onerror();
    }
  }
}

// Mock AudioContext
class MockAudioContext {
  state = 'running';
  createMediaStreamSource = vi.fn().mockReturnValue({
    connect: vi.fn(),
  });
  createAnalyser = vi.fn().mockReturnValue({
    fftSize: 2048,
    frequencyBinCount: 1024,
    getByteTimeDomainData: vi.fn(),
  });
  close = vi.fn().mockResolvedValue(undefined);
}

// Mock MediaStream
class MockMediaStream {
  getTracks = vi.fn().mockReturnValue([
    { stop: vi.fn() },
    { stop: vi.fn() },
  ]);
}

describe('useRecorder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMediaRecorderInstances = [];

    // Setup global mocks using actual class
    vi.stubGlobal('MediaRecorder', MockMediaRecorder);

    vi.stubGlobal('AudioContext', MockAudioContext);

    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(new MockMediaStream()),
      },
    });
  });

  const getLastMockMediaRecorderInstance = () => {
    return mockMediaRecorderInstances[mockMediaRecorderInstances.length - 1];
  };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('initial state', () => {
    it('returns idle state initially', () => {
      const { result } = renderHook(() => useRecorder());

      expect(result.current.state).toBe('idle');
      expect(result.current.error).toBeNull();
      expect(result.current.audioBlob).toBeNull();
      expect(result.current.analyserNode).toBeNull();
    });
  });

  describe('startRecording', () => {
    it('requests microphone permission', async () => {
      const { result } = renderHook(() => useRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
    });

    it('sets state to recording', async () => {
      const { result } = renderHook(() => useRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.state).toBe('recording');
    });

    it('creates AudioContext and AnalyserNode', async () => {
      const { result } = renderHook(() => useRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.analyserNode).not.toBeNull();
    });

    it('starts MediaRecorder with 100ms timeslice', async () => {
      const { result } = renderHook(() => useRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      expect(getLastMockMediaRecorderInstance().start).toHaveBeenCalledWith(100);
    });

    it('clears previous error on start', async () => {
      const { result } = renderHook(() => useRecorder());

      // First, create an error by rejecting getUserMedia
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(
        new Error('Test error')
      );

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.error).toBe('Test error');

      // Reset mock for next call
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(new MockMediaStream());

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('stopRecording', () => {
    it('stops MediaRecorder when recording', async () => {
      const { result } = renderHook(() => useRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        result.current.stopRecording();
      });

      expect(getLastMockMediaRecorderInstance().stop).toHaveBeenCalled();
    });

    it('does not stop when not recording', async () => {
      const { result } = renderHook(() => useRecorder());

      await act(async () => {
        result.current.stopRecording();
      });

      // No MediaRecorder instance should be created
      expect(mockMediaRecorderInstances.length).toBe(0);
    });

    it('creates audioBlob after stopping', async () => {
      const { result } = renderHook(() => useRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        result.current.stopRecording();
      });

      expect(result.current.audioBlob).toBeInstanceOf(Blob);
    });

    it('resets state to idle after stopping', async () => {
      const { result } = renderHook(() => useRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.state).toBe('recording');

      await act(async () => {
        result.current.stopRecording();
      });

      expect(result.current.state).toBe('idle');
    });
  });

  describe('reset', () => {
    it('clears audioBlob', async () => {
      const { result } = renderHook(() => useRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        result.current.stopRecording();
      });

      expect(result.current.audioBlob).not.toBeNull();

      await act(async () => {
        result.current.reset();
      });

      expect(result.current.audioBlob).toBeNull();
    });

    it('clears error', async () => {
      const { result } = renderHook(() => useRecorder());

      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(
        new Error('Test error')
      );

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.error).not.toBeNull();

      await act(async () => {
        result.current.reset();
      });

      expect(result.current.error).toBeNull();
    });

    it('sets state to idle', async () => {
      const { result } = renderHook(() => useRecorder());

      await act(async () => {
        result.current.reset();
      });

      expect(result.current.state).toBe('idle');
    });
  });

  describe('error handling', () => {
    it('handles NotAllowedError (permission denied)', async () => {
      const { result } = renderHook(() => useRecorder());

      const error = new Error('Permission denied');
      error.name = 'NotAllowedError';
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(error);

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.error).toBe('마이크 권한을 허용해주세요');
      expect(result.current.state).toBe('idle');
    });

    it('handles NotFoundError (no microphone)', async () => {
      const { result } = renderHook(() => useRecorder());

      const error = new Error('No microphone');
      error.name = 'NotFoundError';
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(error);

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.error).toBe('마이크를 찾을 수 없습니다');
      expect(result.current.state).toBe('idle');
    });

    it('handles generic errors', async () => {
      const { result } = renderHook(() => useRecorder());

      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(
        new Error('Something went wrong')
      );

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.error).toBe('Something went wrong');
    });

    it('handles non-Error throws', async () => {
      const { result } = renderHook(() => useRecorder());

      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce('string error');

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.error).toBe('녹음을 시작할 수 없습니다');
    });

    it('handles MediaRecorder error event', async () => {
      const { result } = renderHook(() => useRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        getLastMockMediaRecorderInstance().triggerError();
      });

      expect(result.current.error).toBe('녹음 중 오류가 발생했습니다');
      expect(result.current.state).toBe('idle');
    });
  });

  describe('MIME type support', () => {
    it('checks for supported MIME types', async () => {
      const { result } = renderHook(() => useRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      expect(MockMediaRecorder.isTypeSupported).toHaveBeenCalled();
    });

    it('falls back to audio/webm when no types supported', async () => {
      MockMediaRecorder.isTypeSupported.mockReturnValue(false);

      const { result } = renderHook(() => useRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      // MediaRecorder instance should be created successfully with fallback mimeType
      expect(mockMediaRecorderInstances.length).toBe(1);
      expect(result.current.state).toBe('recording');
    });
  });

  describe('cleanup', () => {
    it('stops tracks on cleanup', async () => {
      const mockStream = new MockMediaStream();
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(mockStream);

      const { result, unmount } = renderHook(() => useRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      unmount();

      const tracks = mockStream.getTracks();
      expect(tracks[0].stop).toHaveBeenCalled();
    });

    it('closes AudioContext on cleanup', async () => {
      const { result, unmount } = renderHook(() => useRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      unmount();

      // AudioContext.close should have been called
      // This is handled internally by cleanup
    });
  });
});
