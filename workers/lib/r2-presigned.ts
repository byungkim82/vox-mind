import { AwsClient } from 'aws4fetch';
import type { Env } from './types';

const R2_BUCKET_NAME = 'vox-mind-audio-temp';

/**
 * R2 객체에 대한 presigned URL 생성
 * Groq API가 직접 R2에서 오디오 파일을 다운로드할 수 있도록 함
 */
export async function generatePresignedUrl(
  fileName: string,
  env: Env,
  expiresIn: number = 3600 // 기본 1시간
): Promise<string> {
  const R2_URL = `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`;

  const client = new AwsClient({
    service: 's3',
    region: 'auto',
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  });

  const signedRequest = await client.sign(
    new Request(
      `${R2_URL}/${R2_BUCKET_NAME}/${fileName}?X-Amz-Expires=${expiresIn}`,
      { method: 'GET' }
    ),
    { aws: { signQuery: true } }
  );

  return signedRequest.url.toString();
}
