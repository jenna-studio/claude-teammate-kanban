/**
 * Request validation middleware
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { HttpError } from './errorHandler.js';

/**
 * Validates request parameters against a Zod schema
 * @param schema - Zod schema to validate against
 * @param property - Which part of the request to validate ('body', 'query', 'params')
 */
export function validate(
  schema: z.ZodSchema,
  property: 'body' | 'query' | 'params' = 'body'
) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const result = schema.parse(req[property]);
      req[property] = result;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        next(new HttpError(400, 'Validation failed', formattedErrors));
      } else {
        next(error);
      }
    }
  };
}

/**
 * Common validation schemas
 */
export const schemas = {
  // Board ID parameter
  boardId: z.object({
    id: z.string().min(1, 'Board ID is required'),
  }),

  // Task ID parameter
  taskId: z.object({
    id: z.string().min(1, 'Task ID is required'),
  }),

  // Agent ID parameter
  agentId: z.object({
    id: z.string().min(1, 'Agent ID is required'),
  }),

  // Add comment request
  addComment: z.object({
    taskId: z.string().min(1, 'Task ID is required'),
    author: z.string().min(1, 'Author is required'),
    content: z.string().min(1, 'Comment content is required'),
    authorType: z.enum(['agent', 'human']).default('human'),
    parentCommentId: z.string().optional(),
  }),

  // Task filters query
  taskFilters: z.object({
    boardId: z.string().optional(),
    agentId: z.string().optional(),
    status: z.enum(['todo', 'claimed', 'in_progress', 'review', 'done']).optional(),
    importance: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  }),
};
