import { Buffer } from 'node:buffer';
import type { Env, WhisperResponse } from './types';

export async function transcribeWithWorkersAI(
  audioBuffer: ArrayBuffer,
  env: Env
): Promise<string> {
  // Convert ArrayBuffer to Base64 string for Workers AI Whisper
  // Workers AI expects audio as Base64 encoded string
  const base64Audio = Buffer.from(audioBuffer).toString('base64');

  console.log(`[STT] Audio base64 length: ${base64Audio.length} chars`);

  const response = await env.AI.run('@cf/openai/whisper-large-v3-turbo', {
    audio: base64Audio,
  }) as WhisperResponse;

  if (!response.text) {
    throw new Error('Workers AI STT: 전사 텍스트 없음');
  }

  return response.text;
}
