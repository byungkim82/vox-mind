import type { Env } from '../../lib/types';

export async function transcribeAudio(
  audioBuffer: ArrayBuffer,
  env: Env
): Promise<string> {
  const formData = new FormData();
  const blob = new Blob([audioBuffer], { type: 'audio/webm' });
  formData.append('file', blob, 'audio.webm');
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
