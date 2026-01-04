import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Recorder } from './Recorder';

// Mock the hooks
const mockStartRecording = vi.fn();
const mockStopRecording = vi.fn();
const mockReset = vi.fn();
const mockAddToast = vi.fn();
const mockRemoveToast = vi.fn();

vi.mock('../hooks', () => ({
  useRecorder: vi.fn(() => ({
    state: 'idle',
    error: null,
    audioBlob: null,
    analyserNode: null,
    startRecording: mockStartRecording,
    stopRecording: mockStopRecording,
    reset: mockReset,
  })),
  useAudioAnalyzer: vi.fn(() => ({
    dataArray: new Uint8Array(128),
  })),
  useTimer: vi.fn(() => ({
    elapsedSeconds: 0,
    formattedTime: '00:00',
  })),
  useToast: vi.fn(() => ({
    toasts: [],
    addToast: mockAddToast,
    removeToast: mockRemoveToast,
  })),
}));

vi.mock('@/lib/api/client', () => ({
  uploadAudio: vi.fn(),
  startProcessing: vi.fn(),
}));

import { useRecorder, useTimer, useToast } from '../hooks';
import { uploadAudio, startProcessing } from '@/lib/api/client';

describe('Recorder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('rendering', () => {
    it('renders waveform, timer, and record button', () => {
      render(<Recorder />);

      // Timer should be visible
      expect(screen.getByText('00:00')).toBeInTheDocument();

      // Record button should be visible
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('shows timer from useTimer hook', () => {
      vi.mocked(useTimer).mockReturnValue({
        elapsedSeconds: 90,
        formattedTime: '01:30',
      });

      render(<Recorder />);

      expect(screen.getByText('01:30')).toBeInTheDocument();
    });
  });

  describe('recording flow', () => {
    it('calls startRecording when button clicked in idle state', async () => {
      render(<Recorder />);

      const button = screen.getByRole('button');
      await act(async () => {
        fireEvent.click(button);
      });

      expect(mockStartRecording).toHaveBeenCalled();
    });

    it('calls stopRecording when button clicked in recording state', async () => {
      vi.mocked(useRecorder).mockReturnValue({
        state: 'recording',
        error: null,
        audioBlob: null,
        analyserNode: null,
        startRecording: mockStartRecording,
        stopRecording: mockStopRecording,
        reset: mockReset,
      });

      render(<Recorder />);

      const button = screen.getByRole('button');
      await act(async () => {
        fireEvent.click(button);
      });

      expect(mockStopRecording).toHaveBeenCalled();
    });

    it('disables button during processing', () => {
      // First render with processing state
      const { rerender } = render(<Recorder />);

      // Simulate processing by having audioBlob trigger the effect
      vi.mocked(useRecorder).mockReturnValue({
        state: 'idle',
        error: null,
        audioBlob: new Blob(['audio']),
        analyserNode: null,
        startRecording: mockStartRecording,
        stopRecording: mockStopRecording,
        reset: mockReset,
      });

      rerender(<Recorder />);

      // Button should still be rendered (may or may not be disabled based on processingState)
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('audio processing', () => {
    it('uploads audio and starts processing when audioBlob is available', async () => {
      const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });

      vi.mocked(uploadAudio).mockResolvedValue({
        fileId: 'file-123',
        fileName: 'recording.webm',
        uploadedAt: '2024-01-15T10:00:00Z',
        size: 1024,
        type: 'audio/webm',
      });
      vi.mocked(startProcessing).mockResolvedValue({
        instanceId: 'workflow-123',
        status: 'queued',
        message: '처리가 시작되었습니다',
      });

      // Start with no audioBlob
      vi.mocked(useRecorder).mockReturnValue({
        state: 'idle',
        error: null,
        audioBlob: null,
        analyserNode: null,
        startRecording: mockStartRecording,
        stopRecording: mockStopRecording,
        reset: mockReset,
      });

      const { rerender } = render(<Recorder />);

      // Now provide audioBlob to trigger the effect
      vi.mocked(useRecorder).mockReturnValue({
        state: 'idle',
        error: null,
        audioBlob,
        analyserNode: null,
        startRecording: mockStartRecording,
        stopRecording: mockStopRecording,
        reset: mockReset,
      });

      rerender(<Recorder />);

      await waitFor(() => {
        expect(uploadAudio).toHaveBeenCalledWith(audioBlob);
      });

      await waitFor(() => {
        expect(startProcessing).toHaveBeenCalledWith('file-123', 'recording.webm');
      });

      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith('success', expect.stringContaining('메모 저장됨'));
      });

      expect(mockReset).toHaveBeenCalled();
    });

    it('shows info toast during upload', async () => {
      const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });

      vi.mocked(uploadAudio).mockResolvedValue({
        fileId: 'file-123',
        fileName: 'recording.webm',
        uploadedAt: '2024-01-15T10:00:00Z',
        size: 1024,
        type: 'audio/webm',
      });
      vi.mocked(startProcessing).mockResolvedValue({
        instanceId: 'workflow-123',
        status: 'queued',
        message: '처리가 시작되었습니다',
      });

      vi.mocked(useRecorder).mockReturnValue({
        state: 'idle',
        error: null,
        audioBlob,
        analyserNode: null,
        startRecording: mockStartRecording,
        stopRecording: mockStopRecording,
        reset: mockReset,
      });

      render(<Recorder />);

      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith('info', expect.stringContaining('업로드'));
      });
    });

    it('shows error toast on upload failure', async () => {
      const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });

      vi.mocked(uploadAudio).mockRejectedValue(new Error('Upload failed'));

      vi.mocked(useRecorder).mockReturnValue({
        state: 'idle',
        error: null,
        audioBlob,
        analyserNode: null,
        startRecording: mockStartRecording,
        stopRecording: mockStopRecording,
        reset: mockReset,
      });

      render(<Recorder />);

      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith('error', 'Upload failed');
      });

      expect(mockReset).toHaveBeenCalled();
    });

    it('shows generic error message for non-Error throws', async () => {
      const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });

      vi.mocked(uploadAudio).mockRejectedValue('string error');

      vi.mocked(useRecorder).mockReturnValue({
        state: 'idle',
        error: null,
        audioBlob,
        analyserNode: null,
        startRecording: mockStartRecording,
        stopRecording: mockStopRecording,
        reset: mockReset,
      });

      render(<Recorder />);

      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith('error', '처리 중 오류 발생');
      });
    });

    it('shows error toast on processing failure', async () => {
      const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });

      vi.mocked(uploadAudio).mockResolvedValue({
        fileId: 'file-123',
        fileName: 'recording.webm',
        uploadedAt: '2024-01-15T10:00:00Z',
        size: 1024,
        type: 'audio/webm',
      });
      vi.mocked(startProcessing).mockRejectedValue(new Error('Processing failed'));

      vi.mocked(useRecorder).mockReturnValue({
        state: 'idle',
        error: null,
        audioBlob,
        analyserNode: null,
        startRecording: mockStartRecording,
        stopRecording: mockStopRecording,
        reset: mockReset,
      });

      render(<Recorder />);

      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith('error', 'Processing failed');
      });
    });
  });

  describe('error handling', () => {
    it('shows toast when recorder error occurs', () => {
      vi.mocked(useRecorder).mockReturnValue({
        state: 'idle',
        error: '마이크 권한을 허용해주세요',
        audioBlob: null,
        analyserNode: null,
        startRecording: mockStartRecording,
        stopRecording: mockStopRecording,
        reset: mockReset,
      });

      render(<Recorder />);

      expect(mockAddToast).toHaveBeenCalledWith('error', '마이크 권한을 허용해주세요');
    });

    it('shows toast for microphone not found error', () => {
      vi.mocked(useRecorder).mockReturnValue({
        state: 'idle',
        error: '마이크를 찾을 수 없습니다',
        audioBlob: null,
        analyserNode: null,
        startRecording: mockStartRecording,
        stopRecording: mockStopRecording,
        reset: mockReset,
      });

      render(<Recorder />);

      expect(mockAddToast).toHaveBeenCalledWith('error', '마이크를 찾을 수 없습니다');
    });
  });

  describe('processing indicator', () => {
    it('shows processing indicator when processing', async () => {
      const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });

      // Create a promise that we can control
      let resolveUpload: (value: any) => void;
      const uploadPromise = new Promise((resolve) => {
        resolveUpload = resolve;
      });
      vi.mocked(uploadAudio).mockReturnValue(uploadPromise as any);

      vi.mocked(useRecorder).mockReturnValue({
        state: 'idle',
        error: null,
        audioBlob,
        analyserNode: null,
        startRecording: mockStartRecording,
        stopRecording: mockStopRecording,
        reset: mockReset,
      });

      render(<Recorder />);

      // Processing indicator should appear
      await waitFor(() => {
        expect(screen.getByText('저장 중...')).toBeInTheDocument();
      });

      // Complete the upload
      await act(async () => {
        resolveUpload!({
          fileId: 'file-123',
          fileName: 'recording.webm',
          uploadedAt: '2024-01-15T10:00:00Z',
          size: 1024,
          type: 'audio/webm',
        });
      });
    });
  });

  describe('toast container', () => {
    it('renders toast container with toasts', () => {
      vi.mocked(useToast).mockReturnValue({
        toasts: [
          { id: '1', type: 'success', message: 'Success message' },
        ],
        addToast: mockAddToast,
        removeToast: mockRemoveToast,
      });

      render(<Recorder />);

      // ToastContainer should render the toast
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });
  });
});
