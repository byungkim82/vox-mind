import type { Env, WhisperResponse } from './types';

export async function transcribeWithWorkersAI(
  audioBuffer: ArrayBuffer,
  env: Env
): Promise<string> {
  // Workers AI expects Uint8Array for audio input
  const audioData = new Uint8Array(audioBuffer);

  const response = await env.AI.run('@cf/openai/whisper-large-v3-turbo', {
    audio: [...audioData], // Spread into array for Workers AI
  }) as WhisperResponse;

  if (!response.text) {
    throw new Error('Workers AI STT: 전사 텍스트 없음');
  }

  return response.text;
}
