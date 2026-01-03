import type { Env } from './types';

interface GroqTranscriptionResponse {
  text: string;
  x_groq?: {
    id: string;
  };
}

interface GroqErrorResponse {
  error?: {
    message: string;
    type: string;
    code?: string;
  };
}

/**
 * Groq Whisper Large v3 Turbo를 사용하여 오디오 전사
 * URL 방식으로 R2 presigned URL을 전달 (multipart/form-data 필수)
 */
export async function transcribeWithGroq(
  audioUrl: string,
  env: Env
): Promise<string> {
  // Groq API는 multipart/form-data 형식을 요구함
  const formData = new FormData();
  formData.append('url', audioUrl);
  formData.append('model', 'whisper-large-v3-turbo');
  formData.append('language', 'ko'); // 한국어 힌트 (한영 혼용도 잘 처리됨)
  formData.append('response_format', 'json');

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.GROQ_API_KEY}`,
      // Content-Type은 FormData 사용 시 자동 설정됨 (boundary 포함)
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Groq STT 실패: ${response.status}`;

    try {
      const errorJson = JSON.parse(errorText) as GroqErrorResponse;
      if (errorJson.error?.message) {
        errorMessage = `Groq STT 실패: ${errorJson.error.message}`;
      }
    } catch {
      errorMessage = `Groq STT 실패: ${response.status} - ${errorText}`;
    }

    throw new Error(errorMessage);
  }

  const result = (await response.json()) as GroqTranscriptionResponse;

  if (!result.text) {
    throw new Error('Groq STT: 전사 텍스트 없음');
  }

  return result.text;
}
