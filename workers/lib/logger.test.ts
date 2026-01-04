import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createLogger,
  apiLogger,
  workflowLogger,
  ragLogger,
  authLogger,
} from './logger';

describe('logger', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createLogger', () => {
    it('creates a logger with all methods', () => {
      const logger = createLogger();

      expect(logger).toHaveProperty('debug');
      expect(logger).toHaveProperty('info');
      expect(logger).toHaveProperty('warn');
      expect(logger).toHaveProperty('error');
    });

    it('creates a logger with a prefix', () => {
      const logger = createLogger('TestPrefix');

      logger.info('Test message');

      expect(consoleLogSpy).toHaveBeenCalledWith('[TestPrefix] Test message');
    });

    it('creates a logger without prefix', () => {
      const logger = createLogger();

      logger.info('Test message');

      expect(consoleLogSpy).toHaveBeenCalledWith('Test message');
    });
  });

  describe('debug', () => {
    it('logs debug messages with console.log', () => {
      const logger = createLogger('Debug');

      logger.debug('Debug message');

      expect(consoleLogSpy).toHaveBeenCalledWith('[Debug] Debug message');
    });

    it('includes fileId in context', () => {
      const logger = createLogger('Debug');

      logger.debug('Processing file', { fileId: 'file-123' });

      expect(consoleLogSpy).toHaveBeenCalledWith('[Debug] [file-123] Processing file');
    });
  });

  describe('info', () => {
    it('logs info messages with console.log', () => {
      const logger = createLogger('Info');

      logger.info('Info message');

      expect(consoleLogSpy).toHaveBeenCalledWith('[Info] Info message');
    });

    it('includes context fileId', () => {
      const logger = createLogger('Info');

      logger.info('Uploaded file', { fileId: 'abc-123' });

      expect(consoleLogSpy).toHaveBeenCalledWith('[Info] [abc-123] Uploaded file');
    });
  });

  describe('warn', () => {
    it('logs warning messages with console.warn', () => {
      const logger = createLogger('Warn');

      logger.warn('Warning message');

      expect(consoleWarnSpy).toHaveBeenCalledWith('[Warn] Warning message');
    });

    it('includes context fileId', () => {
      const logger = createLogger('Warn');

      logger.warn('File processing slow', { fileId: 'slow-file' });

      expect(consoleWarnSpy).toHaveBeenCalledWith('[Warn] [slow-file] File processing slow');
    });
  });

  describe('error', () => {
    it('logs error messages with console.error', () => {
      const logger = createLogger('Error');

      logger.error('Error message', new Error('Something went wrong'));

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Error] Error message: Something went wrong'
      );
    });

    it('handles Error objects', () => {
      const logger = createLogger('Error');
      const error = new Error('Database connection failed');

      logger.error('DB Error', error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Error] DB Error: Database connection failed'
      );
    });

    it('handles string errors', () => {
      const logger = createLogger('Error');

      logger.error('Failed', 'string error');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[Error] Failed: string error');
    });

    it('handles undefined error', () => {
      const logger = createLogger('Error');

      logger.error('Failed', undefined);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[Error] Failed: undefined');
    });

    it('handles null error', () => {
      const logger = createLogger('Error');

      logger.error('Failed', null);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[Error] Failed: null');
    });

    it('handles numeric error', () => {
      const logger = createLogger('Error');

      logger.error('Error code', 404);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[Error] Error code: 404');
    });

    it('includes context fileId', () => {
      const logger = createLogger('Error');

      logger.error('Processing failed', new Error('STT error'), { fileId: 'err-file' });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Error] [err-file] Processing failed: STT error'
      );
    });
  });

  describe('context handling', () => {
    it('combines prefix and fileId', () => {
      const logger = createLogger('API');

      logger.info('Request received', { fileId: 'req-123' });

      expect(consoleLogSpy).toHaveBeenCalledWith('[API] [req-123] Request received');
    });

    it('handles missing context', () => {
      const logger = createLogger('API');

      logger.info('Simple message');

      expect(consoleLogSpy).toHaveBeenCalledWith('[API] Simple message');
    });

    it('handles empty context', () => {
      const logger = createLogger('API');

      logger.info('Message with empty context', {});

      expect(consoleLogSpy).toHaveBeenCalledWith('[API] Message with empty context');
    });
  });

  describe('pre-configured loggers', () => {
    describe('apiLogger', () => {
      it('has API prefix', () => {
        apiLogger.info('Test');

        expect(consoleLogSpy).toHaveBeenCalledWith('[API] Test');
      });

      it('logs errors correctly', () => {
        apiLogger.error('Request failed', new Error('Network error'));

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '[API] Request failed: Network error'
        );
      });
    });

    describe('workflowLogger', () => {
      it('has Workflow prefix', () => {
        workflowLogger.info('Step completed');

        expect(consoleLogSpy).toHaveBeenCalledWith('[Workflow] Step completed');
      });

      it('logs with fileId context', () => {
        workflowLogger.info('Processing', { fileId: 'wf-123' });

        expect(consoleLogSpy).toHaveBeenCalledWith('[Workflow] [wf-123] Processing');
      });
    });

    describe('ragLogger', () => {
      it('has RAG prefix', () => {
        ragLogger.info('Search completed');

        expect(consoleLogSpy).toHaveBeenCalledWith('[RAG] Search completed');
      });

      it('logs debug messages', () => {
        ragLogger.debug('Query embedding generated');

        expect(consoleLogSpy).toHaveBeenCalledWith('[RAG] Query embedding generated');
      });
    });

    describe('authLogger', () => {
      it('has Auth prefix', () => {
        authLogger.info('User authenticated');

        expect(consoleLogSpy).toHaveBeenCalledWith('[Auth] User authenticated');
      });

      it('logs warnings', () => {
        authLogger.warn('Token expiring soon');

        expect(consoleWarnSpy).toHaveBeenCalledWith('[Auth] Token expiring soon');
      });

      it('logs authentication errors', () => {
        authLogger.error('JWT verification failed', new Error('Invalid signature'));

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '[Auth] JWT verification failed: Invalid signature'
        );
      });
    });
  });
});
