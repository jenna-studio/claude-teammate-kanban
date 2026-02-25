/**
 * Error handling middleware
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Custom error class with HTTP status code
 */
export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/**
 * Global error handler middleware
 * Catches all errors and returns appropriate HTTP responses
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error details
  console.error('[Error]', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Handle custom HTTP errors
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // Handle validation errors (Zod, etc.)
  if (err.name === 'ZodError') {
    res.status(400).json({
      success: false,
      error: {
        message: 'Validation error',
        details: err,
      },
    });
    return;
  }

  // Handle database errors
  if (err.message.includes('SQLITE') || err.message.includes('database')) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Database error',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined,
      },
    });
    return;
  }

  // Default to 500 Internal Server Error
  res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    },
  });
}

/**
 * Not found handler middleware
 * Returns 404 for unmatched routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found',
      path: req.path,
    },
  });
}

/**
 * Async handler wrapper to catch promise rejections
 * Wraps async route handlers to automatically catch errors
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
