import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { formatZodError } from '@shared/validation';
import { log } from './vite';

// Custom error class for API errors
export class ApiError extends Error {
  statusCode: number;
  details?: any;

  constructor(statusCode: number, message: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

// Common HTTP status codes and messages
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

// Error names for specific error types
export const ErrorTypes = {
  VALIDATION_ERROR: 'ValidationError',
  AUTHENTICATION_ERROR: 'AuthenticationError',
  AUTHORIZATION_ERROR: 'AuthorizationError',
  RESOURCE_NOT_FOUND: 'ResourceNotFoundError',
  RESOURCE_CONFLICT: 'ResourceConflictError',
  DATABASE_ERROR: 'DatabaseError',
  EXTERNAL_SERVICE_ERROR: 'ExternalServiceError',
  INTERNAL_ERROR: 'InternalError'
};

// Error handler middleware
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // Log the error for debugging
  log(`Error: ${err.message}`, 'error');
  if (err.stack) {
    log(err.stack, 'error');
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const formattedError = formatZodError(err);
    return res.status(HttpStatus.BAD_REQUEST).json(formattedError);
  }

  // Handle custom API errors
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      message: err.message,
      ...(err.details ? { details: err.details } : {})
    });
  }

  // Handle other types of errors
  const statusCode = err.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
  const message = err.message || 'An unexpected error occurred';

  // Don't expose internal server error details in production
  if (statusCode === HttpStatus.INTERNAL_SERVER_ERROR && process.env.NODE_ENV === 'production') {
    return res.status(statusCode).json({ message: 'Internal Server Error' });
  }

  return res.status(statusCode).json({ message });
};

// Async route handler wrapper to catch errors
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Not found middleware
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(HttpStatus.NOT_FOUND).json({ message: `Route ${req.method} ${req.path} not found` });
};

// Helper functions for throwing common errors
export const throwBadRequest = (message: string, details?: any) => {
  throw new ApiError(HttpStatus.BAD_REQUEST, message, details);
};

export const throwUnauthorized = (message: string = 'Unauthorized') => {
  throw new ApiError(HttpStatus.UNAUTHORIZED, message);
};

export const throwForbidden = (message: string = 'Forbidden') => {
  throw new ApiError(HttpStatus.FORBIDDEN, message);
};

export const throwNotFound = (resource: string) => {
  throw new ApiError(HttpStatus.NOT_FOUND, `${resource} not found`);
};

export const throwConflict = (message: string, details?: any) => {
  throw new ApiError(HttpStatus.CONFLICT, message, details);
};

export const throwInternal = (message: string = 'Internal Server Error', details?: any) => {
  throw new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, message, details);
};