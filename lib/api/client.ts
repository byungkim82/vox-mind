import type {
  UploadResponse,
  ProcessResponse,
  ProcessStartResponse,
  ProcessStatusResponse,
  ApiError,
} from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Polling configuration
const POLL_INTERVAL = 2000; // 2 seconds
const MAX_POLL_ATTEMPTS = 150; // Maximum 5 minutes

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

// Start processing (triggers Workflow)
export async function startProcessing(
  fileId: string,
  fileName: string
): Promise<ProcessStartResponse> {
  const response = await fetch(`${API_BASE}/api/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileId, fileName }),
    credentials: 'include',
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error || '처리 시작 실패');
  }

  return response.json();
}

// Check processing status
export async function checkProcessingStatus(
  instanceId: string
): Promise<ProcessStatusResponse> {
  const response = await fetch(`${API_BASE}/api/process/${instanceId}`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error || '상태 확인 실패');
  }

  return response.json();
}

// Process audio with polling (async Workflow)
async function processAudioAsync(
  fileId: string,
  fileName: string
): Promise<ProcessResponse> {
  // Start processing
  const { instanceId } = await startProcessing(fileId, fileName);

  // Poll for completion
  let attempts = 0;
  while (attempts < MAX_POLL_ATTEMPTS) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));

    const status = await checkProcessingStatus(instanceId);

    if (status.status === 'complete' && status.output) {
      return {
        memoId: status.output.memoId,
        title: status.output.title,
        summary: status.output.summary,
        category: status.output.category,
        actionItems: status.output.actionItems,
        rawTextLength: 0, // Not available from workflow output
      };
    }

    if (status.status === 'errored' || status.status === 'terminated') {
      throw new Error(status.error || '처리 실패');
    }

    attempts++;
  }

  throw new Error('처리 시간 초과');
}

// Export processAudio using async workflow
export const processAudio = processAudioAsync;
