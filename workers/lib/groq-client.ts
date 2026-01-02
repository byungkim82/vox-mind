import type { Env } from './types';

function getMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || 'webm';
  const mimeMap: Record<string, string> = {
    webm: 'audio/webm',
    mp4: 'audio/mp4',
    m4a: 'audio/mp4',
    wav: 'audio/wav',
    mp3: 'audio/mpeg',
    mpeg: 'audio/mpeg',
  };
  return mimeMap[ext] || 'audio/webm';
}

export async function transcribeAudio(
  audioBuffer: ArrayBuffer,
  fileName: string,
  env: Env
): Promise<string> {
  const formData = new FormData();
  const mimeType = getMimeType(fileName);
  const blob = new Blob([audioBuffer], { type: mimeType });
  formData.append('file', blob, fileName);
  formData.append('model', 'whisper-large-v3-turbo');
  formData.append('language', 'ko');
  formData.append('response_format', 'json');

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.GROQ_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq STT failed: ${response.status} ${error}`);
  }

  const data = await response.json() as { text: string };
  return data.text;
}
