import { Express, Request, Response } from "express";
import { pool } from "./db";

interface AuthUser {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
}

// Authentication middleware
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated()) {
    console.log('AUTH DEBUG: User authenticated in sqlRoutes:', req.user);
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

// Admin role middleware
const isAdmin = (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const user = req.user as AuthUser;
  if (user.role !== 'admin') {
    return res.status(403).json({ message: "Forbidden: Admin access required" });
  }
  
  next();
};

export function registerSqlRoutes(app: Express) {
  // Add SQL endpoint for testing only
  app.post('/api/sql', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      if (!req.body.sql_query) {
        return res.status(400).json({
          error: 'Missing sql_query parameter'
        });
      }
      
      const result = await pool.query(req.body.sql_query);
      res.json(result);
    } catch (error: any) {
      console.error('SQL Error:', error);
      res.status(500).json({
        error: error.message
      });
    }
  });
}