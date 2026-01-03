'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRecorder, useAudioAnalyzer, useTimer, useToast } from '../hooks';
import { uploadAudio, startProcessing } from '@/lib/api/client';
import { RecordButton } from './RecordButton';
import { Waveform } from './Waveform';
import { Timer } from './Timer';
import { ToastContainer } from '../Toast';
import type { RecordingState } from '@/lib/types';

export function Recorder() {
  const [processingState, setProcessingState] = useState<RecordingState>('idle');

  const {
    state: recorderState,
    error: recorderError,
    audioBlob,
    analyserNode,
    startRecording,
    stopRecording,
    reset,
  } = useRecorder();

  const { dataArray } = useAudioAnalyzer(analyserNode);
  const { formattedTime } = useTimer(recorderState === 'recording');
  const { toasts, addToast, removeToast } = useToast();

  const isRecording = recorderState === 'recording';
  const isProcessing = processingState === 'processing';

  const handleRecordClick = useCallback(async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // Fire-and-forget: Upload and trigger workflow, then immediately done
  useEffect(() => {
    if (!audioBlob) return;

    const processRecording = async () => {
      setProcessingState('processing');

      try {
        addToast('info', '음성 업로드 중...');
        const uploadResult = await uploadAudio(audioBlob);

        // Trigger workflow (fire-and-forget, no polling)
        await startProcessing(uploadResult.fileId, uploadResult.fileName);

        addToast('success', '메모 저장됨! 메모 목록에서 확인하세요.');
      } catch (error) {
        const message = error instanceof Error ? error.message : '처리 중 오류 발생';
        addToast('error', message);
      } finally {
        setProcessingState('idle');
        reset();
      }
    };

    processRecording();
  }, [audioBlob, addToast, reset]);

  // Show recorder error
  useEffect(() => {
    if (recorderError) {
      addToast('error', recorderError);
    }
  }, [recorderError, addToast]);

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Waveform */}
      <Waveform
        dataArray={dataArray}
        isRecording={isRecording}
        className="w-full h-32 sm:h-48 bg-surface-dark/50 rounded-2xl"
      />

      {/* Timer */}
      <Timer time={formattedTime} isRecording={isRecording} />

      {/* Record Button */}
      <RecordButton
        isRecording={isRecording}
        isProcessing={isProcessing}
        onClick={handleRecordClick}
        disabled={isProcessing}
      />

      {/* Processing indicator */}
      {isProcessing && (
        <p className="text-text-secondary text-sm animate-pulse">저장 중...</p>
      )}

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
