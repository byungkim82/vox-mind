/**
 * Simple logger utility for Cloudflare Workers.
 * Provides consistent logging with context prefixes.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  prefix?: string;
  fileId?: string;
}

function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const parts: string[] = [];

  if (context?.prefix) {
    parts.push(`[${context.prefix}]`);
  }
  if (context?.fileId) {
    parts.push(`[${context.fileId}]`);
  }

  parts.push(message);
  return parts.join(' ');
}

/**
 * Creates a logger with an optional prefix for consistent logging.
 */
export function createLogger(prefix?: string) {
  return {
    debug: (message: string, context?: LogContext) => {
      console.log(formatMessage('debug', message, { ...context, prefix }));
    },

    info: (message: string, context?: LogContext) => {
      console.log(formatMessage('info', message, { ...context, prefix }));
    },

    warn: (message: string, context?: LogContext) => {
      console.warn(formatMessage('warn', message, { ...context, prefix }));
    },

    error: (message: string, error?: unknown, context?: LogContext) => {
      const errorDetails = error instanceof Error ? error.message : String(error);
      console.error(formatMessage('error', `${message}: ${errorDetails}`, { ...context, prefix }));
    },
  };
}

// Pre-configured loggers for common use cases
export const apiLogger = createLogger('API');
export const workflowLogger = createLogger('Workflow');
export const ragLogger = createLogger('RAG');
export const authLogger = createLogger('Auth');
