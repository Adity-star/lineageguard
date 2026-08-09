import pino from 'pino';
import { env } from './env.js';
import { randomUUID } from 'crypto';

interface LogContext {
  correlationId?: string;
  userId?: string;
  requestId?: string;
  [key: string]: any;
}

const baseOptions: any = {
  level: env.LOG_LEVEL,
  formatters: {
    level: (label: string) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
};

if (env.NODE_ENV === 'development') {
  baseOptions.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
    },
  };
}

const baseLogger = pino(baseOptions);

export function createLogger(context: LogContext = {}): pino.Logger {
  const correlationId = context.correlationId || randomUUID();

  return baseLogger.child({
    correlationId,
    ...context,
  });
}

export const logger = createLogger();

export class LoggerWithContext {
  private context: LogContext;

  constructor(context: LogContext = {}) {
    this.context = context;
  }

  withContext(additionalContext: LogContext): LoggerWithContext {
    return new LoggerWithContext({
      ...this.context,
      ...additionalContext,
    });
  }

  info(obj: any, msg?: string, ...args: any[]): void {
    createLogger(this.context).info(obj, msg, ...args);
  }

  error(obj: any, msg?: string, ...args: any[]): void {
    createLogger(this.context).error(obj, msg, ...args);
  }

  warn(obj: any, msg?: string, ...args: any[]): void {
    createLogger(this.context).warn(obj, msg, ...args);
  }

  debug(obj: any, msg?: string, ...args: any[]): void {
    createLogger(this.context).debug(obj, msg, ...args);
  }
}
