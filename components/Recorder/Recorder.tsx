'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRecorder, useAudioAnalyzer, useTimer, useToast } from '../hooks';
import { uploadAudio, processAudio } from '@/lib/api/client';
import { RecordButton } from './RecordButton';
import { Waveform } from './Waveform';
import { Timer } from './Timer';
import { ToastContainer } from '../Toast';
import type { ProcessResponse, RecordingState } from '@/lib/types';

export function Recorder() {
  const [processingState, setProcessingState] = useState<RecordingState>('idle');
  const [result, setResult] = useState<ProcessResponse | null>(null);

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
      setResult(null);
      await startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // Process audio when blob is available
  useEffect(() => {
    if (!audioBlob) return;

    const processRecording = async () => {
      setProcessingState('processing');

      try {
        addToast('info', '음성 업로드 중...');
        const uploadResult = await uploadAudio(audioBlob);

        addToast('info', 'AI 처리 중...');
        const processResult = await processAudio(uploadResult.fileId, uploadResult.fileName);

        setResult(processResult);
        addToast('success', `메모 생성 완료: "${processResult.title}"`);
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
        className="w-full h-32 bg-gray-100 rounded-lg"
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
        <p className="text-gray-600 text-sm animate-pulse">처리 중...</p>
      )}

      {/* Result display */}
      {result && (
        <div className="w-full mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold text-green-900">{result.title}</h3>
          <p className="text-green-800 text-sm mt-1">{result.summary}</p>
          <div className="flex items-center gap-2 mt-3">
            <span className="px-2 py-1 bg-green-200 text-green-800 rounded text-xs">
              {result.category}
            </span>
            {result.actionItems.length > 0 && (
              <span className="text-green-700 text-xs">
                {result.actionItems.length}개 액션 아이템
              </span>
            )}
          </div>
        </div>
      )}

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
