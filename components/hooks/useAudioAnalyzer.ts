'use client';

import { useState, useEffect, useRef } from 'react';

interface UseAudioAnalyzerOptions {
  fftSize?: number;
}

export function useAudioAnalyzer(
  analyserNode: AnalyserNode | null,
  options?: UseAudioAnalyzerOptions
) {
  const [dataArray, setDataArray] = useState<Uint8Array | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!analyserNode) {
      setDataArray(null);
      return;
    }

    const fftSize = options?.fftSize ?? 2048;
    analyserNode.fftSize = fftSize;
    const bufferLength = analyserNode.frequencyBinCount;
    const data = new Uint8Array(bufferLength);

    const analyze = () => {
      analyserNode.getByteTimeDomainData(data);
      setDataArray(new Uint8Array(data)); // Copy to trigger re-render
      rafRef.current = requestAnimationFrame(analyze);
    };

    rafRef.current = requestAnimationFrame(analyze);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [analyserNode, options?.fftSize]);

  return { dataArray };
}
