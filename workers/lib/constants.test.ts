import { describe, it, expect } from 'vitest';
import {
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
  PRESIGNED_URL_EXPIRY_SECONDS,
  AUTH_CACHE_EXPIRY_MS,
  STRUCTURE_MAX_TOKENS,
  CHAT_MAX_TOKENS,
  RAG_TOP_K,
  SUPPORTED_AUDIO_PREFIXES,
} from './constants';

describe('constants', () => {
  describe('file upload limits', () => {
    it('MAX_FILE_SIZE_BYTES is 50MB', () => {
      expect(MAX_FILE_SIZE_BYTES).toBe(50 * 1024 * 1024);
    });

    it('MAX_FILE_SIZE_MB is 50', () => {
      expect(MAX_FILE_SIZE_MB).toBe(50);
    });

    it('MAX_FILE_SIZE_BYTES equals MAX_FILE_SIZE_MB in bytes', () => {
      expect(MAX_FILE_SIZE_BYTES).toBe(MAX_FILE_SIZE_MB * 1024 * 1024);
    });
  });

  describe('R2 presigned URL', () => {
    it('PRESIGNED_URL_EXPIRY_SECONDS is 1 hour', () => {
      expect(PRESIGNED_URL_EXPIRY_SECONDS).toBe(3600);
    });

    it('expiry is in seconds', () => {
      expect(PRESIGNED_URL_EXPIRY_SECONDS).toBe(60 * 60);
    });
  });

  describe('auth cache', () => {
    it('AUTH_CACHE_EXPIRY_MS is 1 hour in milliseconds', () => {
      expect(AUTH_CACHE_EXPIRY_MS).toBe(3600000);
    });

    it('expiry is in milliseconds', () => {
      expect(AUTH_CACHE_EXPIRY_MS).toBe(60 * 60 * 1000);
    });
  });

  describe('Workers AI settings', () => {
    it('STRUCTURE_MAX_TOKENS is 500', () => {
      expect(STRUCTURE_MAX_TOKENS).toBe(500);
    });

    it('CHAT_MAX_TOKENS is 1024', () => {
      expect(CHAT_MAX_TOKENS).toBe(1024);
    });

    it('CHAT_MAX_TOKENS is greater than STRUCTURE_MAX_TOKENS', () => {
      expect(CHAT_MAX_TOKENS).toBeGreaterThan(STRUCTURE_MAX_TOKENS);
    });
  });

  describe('RAG settings', () => {
    it('RAG_TOP_K is 5', () => {
      expect(RAG_TOP_K).toBe(5);
    });

    it('RAG_TOP_K is a positive integer', () => {
      expect(RAG_TOP_K).toBeGreaterThan(0);
      expect(Number.isInteger(RAG_TOP_K)).toBe(true);
    });
  });

  describe('supported audio MIME types', () => {
    it('includes audio/webm', () => {
      expect(SUPPORTED_AUDIO_PREFIXES).toContain('audio/webm');
    });

    it('includes audio/mp4', () => {
      expect(SUPPORTED_AUDIO_PREFIXES).toContain('audio/mp4');
    });

    it('includes audio/wav', () => {
      expect(SUPPORTED_AUDIO_PREFIXES).toContain('audio/wav');
    });

    it('includes audio/mpeg', () => {
      expect(SUPPORTED_AUDIO_PREFIXES).toContain('audio/mpeg');
    });

    it('includes audio/m4a', () => {
      expect(SUPPORTED_AUDIO_PREFIXES).toContain('audio/m4a');
    });

    it('includes audio/x-m4a', () => {
      expect(SUPPORTED_AUDIO_PREFIXES).toContain('audio/x-m4a');
    });

    it('includes audio/aac', () => {
      expect(SUPPORTED_AUDIO_PREFIXES).toContain('audio/aac');
    });

    it('has 7 supported types', () => {
      expect(SUPPORTED_AUDIO_PREFIXES).toHaveLength(7);
    });

    it('all types start with audio/', () => {
      SUPPORTED_AUDIO_PREFIXES.forEach((type) => {
        expect(type.startsWith('audio/')).toBe(true);
      });
    });

    it('is a readonly array', () => {
      // TypeScript ensures this, but we can verify it's an array
      expect(Array.isArray(SUPPORTED_AUDIO_PREFIXES)).toBe(true);
    });

    it('does not include video types', () => {
      SUPPORTED_AUDIO_PREFIXES.forEach((type) => {
        expect(type.startsWith('video/')).toBe(false);
      });
    });

    it('does not include text types', () => {
      SUPPORTED_AUDIO_PREFIXES.forEach((type) => {
        expect(type.startsWith('text/')).toBe(false);
      });
    });
  });

  describe('value consistency', () => {
    it('presigned URL expiry matches auth cache expiry in hours', () => {
      const presignedHours = PRESIGNED_URL_EXPIRY_SECONDS / 3600;
      const authCacheHours = AUTH_CACHE_EXPIRY_MS / 3600000;

      expect(presignedHours).toBe(authCacheHours);
    });

    it('all numeric constants are positive', () => {
      expect(MAX_FILE_SIZE_BYTES).toBeGreaterThan(0);
      expect(MAX_FILE_SIZE_MB).toBeGreaterThan(0);
      expect(PRESIGNED_URL_EXPIRY_SECONDS).toBeGreaterThan(0);
      expect(AUTH_CACHE_EXPIRY_MS).toBeGreaterThan(0);
      expect(STRUCTURE_MAX_TOKENS).toBeGreaterThan(0);
      expect(CHAT_MAX_TOKENS).toBeGreaterThan(0);
      expect(RAG_TOP_K).toBeGreaterThan(0);
    });
  });
});
