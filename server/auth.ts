import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to check if a user is authenticated
 */
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  // If user exists in session, they're authenticated
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  
  // No authenticated user
  return res.status(401).json({ message: "Unauthorized" });
};