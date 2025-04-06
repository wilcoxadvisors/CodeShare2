/**
 * Authentication and Authorization Middleware
 * 
 * This module provides authentication and authorization middleware
 * for protecting API routes that require user authentication.
 */
import { Request, Response, NextFunction } from 'express';
import { ApiError } from './errorHandling';
import { UserRole } from '@shared/schema';

/**
 * Express middleware to check if a user is authenticated
 */
export const authenticateUser = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return next(new ApiError('Authentication required', 401));
  }
  next();
};

/**
 * Express middleware to check if an authenticated user has admin role
 */
export const authorizeAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return next(new ApiError('Authentication required', 401));
  }
  
  if ((req.user as any).role !== UserRole.ADMIN) {
    return next(new ApiError('Administrator access required', 403));
  }
  
  next();
};

/**
 * Express middleware to check if an authenticated user has employee role
 */
export const authorizeEmployee = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return next(new ApiError('Authentication required', 401));
  }
  
  if ((req.user as any).role !== UserRole.EMPLOYEE && (req.user as any).role !== UserRole.ADMIN) {
    return next(new ApiError('Employee access required', 403));
  }
  
  next();
};

/**
 * Express middleware to check if a user is authorized to access a specific entity
 */
export const authorizeEntityAccess = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return next(new ApiError('Authentication required', 401));
  }

  // Admin users have access to all entities
  if ((req.user as any).role === UserRole.ADMIN) {
    return next();
  }

  // For other users, we would check entity access permissions here
  // This would likely involve checking a user_entity_access table
  
  // For now, just check if the entityId from params matches any in their access list
  const entityId = parseInt(req.params.entityId);
  
  if (isNaN(entityId)) {
    return next(new ApiError('Invalid entity ID', 400));
  }
  
  // If the user has this entity in their allowed entities, continue
  // Otherwise, return a 403 Forbidden error
  if ((req.user as any).accessibleEntities?.includes(entityId)) {
    next();
  } else {
    next(new ApiError('You do not have access to this entity', 403));
  }
};

// Declare session data augmentation for TypeScript
declare module 'express-session' {
  interface SessionData {
    user?: {
      id: number;
      name: string;
      email: string;
      role: UserRole;
      accessibleEntities?: number[];
    };
  }
}