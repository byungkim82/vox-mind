import type { Env } from '../../lib/types';

export async function generateEmbedding(
  text: string,
  env: Env
): Promise<number[]> {
  const response = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      input: text,
      model: 'voyage-3.5-lite',
      truncation: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Voyage API failed: ${response.status} ${error}`);
  }

  const data = await response.json();
  const embedding = data.data[0].embedding as number[];

  // Matryoshka: use first 512 dimensions
  return embedding.slice(0, 512);
}
