/**
 * Backend constants for Cloudflare Workers.
 */

// File upload limits
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
export const MAX_FILE_SIZE_MB = 50;

// R2 presigned URL
export const PRESIGNED_URL_EXPIRY_SECONDS = 3600; // 1 hour

// Auth cache
export const AUTH_CACHE_EXPIRY_MS = 3600000; // 1 hour

// Workers AI settings
export const STRUCTURE_MAX_TOKENS = 500;
export const CHAT_MAX_TOKENS = 1024;

// RAG settings
export const RAG_TOP_K = 5;

// Supported audio MIME types
export const SUPPORTED_AUDIO_PREFIXES = [
  'audio/webm',
  'audio/mp4',
  'audio/wav',
  'audio/mpeg',
  'audio/m4a',
  'audio/x-m4a',
  'audio/aac',
] as const;
