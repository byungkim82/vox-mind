import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generatePresignedUrl } from './r2-presigned';
import type { Env } from './types';

// Mock aws4fetch
vi.mock('aws4fetch', () => {
  return {
    AwsClient: class MockAwsClient {
      constructor() {}
      async sign(request: Request) {
        const url = new URL(request.url);
        url.searchParams.set('X-Amz-Signature', 'mock-signature');
        url.searchParams.set('X-Amz-Credential', 'mock-credential');
        url.searchParams.set('X-Amz-Date', '20240115T120000Z');
        return new Request(url.toString(), { method: request.method });
      }
    },
  };
});

describe('r2-presigned', () => {
  const createMockEnv = (): Partial<Env> => ({
    CLOUDFLARE_ACCOUNT_ID: 'test-account-id',
    R2_ACCESS_KEY_ID: 'test-access-key',
    R2_SECRET_ACCESS_KEY: 'test-secret-key',
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generatePresignedUrl', () => {
    it('generates presigned URL with default expiry', async () => {
      const mockEnv = createMockEnv();

      const result = await generatePresignedUrl('recording.webm', mockEnv as Env);

      expect(result).toContain('test-account-id.r2.cloudflarestorage.com');
      expect(result).toContain('vox-mind-audio-temp');
      expect(result).toContain('recording.webm');
      expect(result).toContain('X-Amz-Expires=3600');
    });

    it('generates presigned URL with custom expiry', async () => {
      const mockEnv = createMockEnv();

      const result = await generatePresignedUrl('test.webm', mockEnv as Env, 7200);

      expect(result).toContain('X-Amz-Expires=7200');
    });

    it('includes AWS signature parameters', async () => {
      const mockEnv = createMockEnv();

      const result = await generatePresignedUrl('audio.mp4', mockEnv as Env);

      expect(result).toContain('X-Amz-Signature');
      expect(result).toContain('X-Amz-Credential');
      expect(result).toContain('X-Amz-Date');
    });

    it('handles filenames with special characters', async () => {
      const mockEnv = createMockEnv();

      const result = await generatePresignedUrl('file with spaces.webm', mockEnv as Env);

      expect(result).toContain('file%20with%20spaces.webm');
    });

    it('handles UUID filenames', async () => {
      const mockEnv = createMockEnv();
      const fileName = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890.webm';

      const result = await generatePresignedUrl(fileName, mockEnv as Env);

      expect(result).toContain(fileName);
    });

    it('uses correct R2 URL format', async () => {
      const mockEnv = createMockEnv();

      const result = await generatePresignedUrl('test.webm', mockEnv as Env);

      expect(result).toMatch(/^https:\/\/test-account-id\.r2\.cloudflarestorage\.com\//);
    });

    it('uses correct bucket name', async () => {
      const mockEnv = createMockEnv();

      const result = await generatePresignedUrl('test.webm', mockEnv as Env);

      expect(result).toContain('/vox-mind-audio-temp/');
    });

    it('handles different file extensions', async () => {
      const mockEnv = createMockEnv();

      const webmUrl = await generatePresignedUrl('audio.webm', mockEnv as Env);
      const mp4Url = await generatePresignedUrl('audio.mp4', mockEnv as Env);
      const wavUrl = await generatePresignedUrl('audio.wav', mockEnv as Env);

      expect(webmUrl).toContain('audio.webm');
      expect(mp4Url).toContain('audio.mp4');
      expect(wavUrl).toContain('audio.wav');
    });

    it('generates unique URL for each call', async () => {
      const mockEnv = createMockEnv();

      const url1 = await generatePresignedUrl('file1.webm', mockEnv as Env);
      const url2 = await generatePresignedUrl('file2.webm', mockEnv as Env);

      expect(url1).not.toBe(url2);
      expect(url1).toContain('file1.webm');
      expect(url2).toContain('file2.webm');
    });

    it('works with short expiry time', async () => {
      const mockEnv = createMockEnv();

      const result = await generatePresignedUrl('test.webm', mockEnv as Env, 60);

      expect(result).toContain('X-Amz-Expires=60');
    });

    it('works with long expiry time', async () => {
      const mockEnv = createMockEnv();

      const result = await generatePresignedUrl('test.webm', mockEnv as Env, 86400);

      expect(result).toContain('X-Amz-Expires=86400');
    });
  });
});
