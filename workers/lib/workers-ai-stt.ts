import type { Env, WhisperResponse } from './types';

export async function transcribeWithWorkersAI(
  audioBuffer: ArrayBuffer,
  env: Env
): Promise<string> {
  // Try passing ArrayBuffer directly
  const response = await env.AI.run('@cf/openai/whisper-large-v3-turbo', {
    audio: audioBuffer,
  }) as WhisperResponse;

  if (!response.text) {
    throw new Error('Workers AI STT: 전사 텍스트 없음');
  }

  return response.text;
}
