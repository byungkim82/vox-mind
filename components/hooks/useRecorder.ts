'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { RecordingState } from '@/lib/types';

interface UseRecorderReturn {
  state: RecordingState;
  error: string | null;
  audioBlob: Blob | null;
  analyserNode: AnalyserNode | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  reset: () => void;
}

function getSupportedMimeType(): string {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/mpeg',
  ];

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return 'audio/webm';
}

export function useRecorder(): UseRecorderReturn {
  const [state, setState] = useState<RecordingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setAnalyserNode(null);
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setAudioBlob(null);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // AudioContext + AnalyserNode for waveform
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      setAnalyserNode(analyser);

      // MediaRecorder
      const mimeType = getSupportedMimeType();
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        cleanup();
        setState('idle');
      };

      mediaRecorder.onerror = () => {
        setError('녹음 중 오류가 발생했습니다');
        cleanup();
        setState('idle');
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setState('recording');
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('마이크 권한을 허용해주세요');
        } else if (err.name === 'NotFoundError') {
          setError('마이크를 찾을 수 없습니다');
        } else {
          setError(err.message);
        }
      } else {
        setError('녹음을 시작할 수 없습니다');
      }
      cleanup();
      setState('idle');
    }
  }, [cleanup]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, [state]);

  const reset = useCallback(() => {
    setAudioBlob(null);
    setError(null);
    setState('idle');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    state,
    error,
    audioBlob,
    analyserNode,
    startRecording,
    stopRecording,
    reset,
  };
}
