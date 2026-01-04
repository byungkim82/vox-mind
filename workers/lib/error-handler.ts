import type { Context } from 'hono';

export interface ErrorResponse {
  error: string;
  details: string;
}

/**
 * Creates a standardized error response for API endpoints.
 * @param c - Hono context
 * @param message - User-facing error message
 * @param error - The caught error
 * @param status - HTTP status code (default: 500)
 */
export function createErrorResponse(
  c: Context,
  message: string,
  error: unknown,
  status: 400 | 401 | 403 | 404 | 413 | 500 = 500
) {
  const details = error instanceof Error ? error.message : 'Unknown error';
  return c.json<ErrorResponse>({ error: message, details }, status);
}

/**
 * Extracts error details from an unknown error.
 */
export function getErrorDetails(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}
