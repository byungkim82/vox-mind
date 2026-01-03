import type { Env, BGEEmbeddingResponse } from './types';

export async function embedWithWorkersAI(
  text: string,
  env: Env
): Promise<number[]> {
  const response = await env.AI.run('@cf/baai/bge-m3', {
    text: [text],
  }) as BGEEmbeddingResponse;

  if (!response.data || !response.data[0]) {
    throw new Error('Workers AI Embed: 임베딩 생성 실패');
  }

  // BGE-M3 returns 1024-dimensional vector
  return response.data[0];
}
