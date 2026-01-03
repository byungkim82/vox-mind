import type { Env, WhisperResponse } from './types';

export async function transcribeWithWorkersAI(
  audioBuffer: ArrayBuffer,
  env: Env
): Promise<string> {
  // Convert ArrayBuffer to number[] for Workers AI Whisper
  // Workers AI expects audio as number[] (byte array)
  const audioInput = [...new Uint8Array(audioBuffer)];

  console.log(`[STT] Audio input length: ${audioInput.length} bytes`);

  const response = await env.AI.run('@cf/openai/whisper-large-v3-turbo', {
    audio: audioInput,
  }) as WhisperResponse;

  if (!response.text) {
    throw new Error('Workers AI STT: 전사 텍스트 없음');
  }

  return response.text;
}
