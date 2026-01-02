import type { UploadResponse, ProcessResponse, ApiError } from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getExtensionFromMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/mp4': 'mp4',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
  };
  return map[mimeType] || 'webm';
}

export async function uploadAudio(blob: Blob): Promise<UploadResponse> {
  const formData = new FormData();
  const extension = getExtensionFromMimeType(blob.type);
  formData.append('file', blob, `recording.${extension}`);

  const response = await fetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error || '업로드 실패');
  }

  return response.json();
}

export async function processAudio(fileId: string, fileName: string): Promise<ProcessResponse> {
  const response = await fetch(`${API_BASE}/api/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileId, fileName }),
    credentials: 'include',
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error || '처리 실패');
  }

  return response.json();
}
