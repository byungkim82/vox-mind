import { describe, it, expect, vi } from 'vitest';
import { createErrorResponse, getErrorDetails } from './error-handler';

describe('error-handler', () => {
  describe('getErrorDetails', () => {
    it('extracts message from Error instance', () => {
      const error = new Error('Something went wrong');
      expect(getErrorDetails(error)).toBe('Something went wrong');
    });

    it('returns "Unknown error" for non-Error objects', () => {
      expect(getErrorDetails('string error')).toBe('Unknown error');
      expect(getErrorDetails(null)).toBe('Unknown error');
      expect(getErrorDetails(undefined)).toBe('Unknown error');
      expect(getErrorDetails(123)).toBe('Unknown error');
      expect(getErrorDetails({ message: 'fake' })).toBe('Unknown error');
    });

    it('handles Error subclasses', () => {
      const typeError = new TypeError('Type error message');
      expect(getErrorDetails(typeError)).toBe('Type error message');

      const rangeError = new RangeError('Range error message');
      expect(getErrorDetails(rangeError)).toBe('Range error message');
    });
  });

  describe('createErrorResponse', () => {
    const createMockContext = () => {
      const jsonMock = vi.fn().mockImplementation((body, status) => ({
        body,
        status,
      }));
      return {
        json: jsonMock,
      } as unknown as Parameters<typeof createErrorResponse>[0];
    };

    it('creates response with Error instance', () => {
      const c = createMockContext();
      const error = new Error('Database connection failed');

      createErrorResponse(c, '메모 조회 실패', error, 500);

      expect(c.json).toHaveBeenCalledWith(
        { error: '메모 조회 실패', details: 'Database connection failed' },
        500
      );
    });

    it('creates response with non-Error object', () => {
      const c = createMockContext();

      createErrorResponse(c, 'Upload failed', 'string error', 500);

      expect(c.json).toHaveBeenCalledWith(
        { error: 'Upload failed', details: 'Unknown error' },
        500
      );
    });

    it('uses default status 500 when not specified', () => {
      const c = createMockContext();
      const error = new Error('Test error');

      createErrorResponse(c, 'Error message', error);

      expect(c.json).toHaveBeenCalledWith(
        expect.any(Object),
        500
      );
    });

    it('supports different status codes', () => {
      const c = createMockContext();
      const error = new Error('Test error');

      const statusCodes: (400 | 401 | 403 | 404 | 413 | 500)[] = [400, 401, 403, 404, 413, 500];

      statusCodes.forEach((status) => {
        createErrorResponse(c, 'Error', error, status);
        expect(c.json).toHaveBeenLastCalledWith(
          expect.any(Object),
          status
        );
      });
    });

    it('returns the response from context.json', () => {
      const c = createMockContext();
      const error = new Error('Test');

      const result = createErrorResponse(c, 'Error', error, 500);

      expect(result).toEqual({
        body: { error: 'Error', details: 'Test' },
        status: 500,
      });
    });

    it('handles Korean error messages', () => {
      const c = createMockContext();
      const error = new Error('데이터베이스 연결 실패');

      createErrorResponse(c, 'AI 답변 생성 실패', error, 500);

      expect(c.json).toHaveBeenCalledWith(
        { error: 'AI 답변 생성 실패', details: '데이터베이스 연결 실패' },
        500
      );
    });
  });
});
