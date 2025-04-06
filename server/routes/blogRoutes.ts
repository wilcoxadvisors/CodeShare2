/**
 * Blog Routes
 * 
 * API endpoints for managing blog posts and subscribers.
 */
import express from 'express';
import { z } from 'zod';
import { DatabaseStorage, IStorage } from '../storage';
import { ApiError } from '../errorHandling';
import { insertBlogPostSchema, insertBlogSubscriberSchema } from '@shared/schema';
import { authenticateUser, authorizeAdmin } from '../authMiddleware';
import { generateSlug } from '../../utils/stringUtils';

// Initialize storage instance
const storage: IStorage = new DatabaseStorage();

const router = express.Router();

// Get all blog posts (public)
router.get('/posts', async (req, res, next) => {
  try {
    // If status is provided, filter by it (admin only)
    let posts;
    if (req.query.status && req.session.user?.role === 'admin') {
      const status = req.query.status as string;
      posts = await storage.forms.getBlogPosts();
      posts = posts.filter(post => post.status === status);
    } else {
      // Otherwise, only return published posts for public viewing
      posts = await storage.forms.getBlogPosts();
      posts = posts.filter(post => post.status === 'published');
    }
    
    // Truncate content for listing view
    const simplifiedPosts = posts.map(post => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      author: post.author,
      imageUrl: post.imageUrl,
      category: post.category,
      publishedAt: post.publishedAt,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      tags: post.tags,
      readTime: post.readTime,
      status: post.status
    }));
    
    res.json({ 
      success: true, 
      posts: simplifiedPosts
    });
  } catch (error) {
    next(error);
  }
});

// Get a single blog post by slug (public)
router.get('/posts/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    const post = await storage.forms.getBlogPostBySlug(slug);
    
    if (!post) {
      throw new ApiError('Blog post not found', 404);
    }
    
    // Only allow viewing published posts unless user is admin
    if (post.status !== 'published' && (!req.isAuthenticated || !req.isAuthenticated() || (req.user as any)?.role !== 'admin')) {
      throw new ApiError('Blog post not found', 404);
    }
    
    res.json({ 
      success: true, 
      post
    });
  } catch (error) {
    next(error);
  }
});

// ADMIN: Create a new blog post
router.post('/posts', authenticateUser, authorizeAdmin, async (req, res, next) => {
  try {
    // Debug user object
    console.log('DEBUG User object:', req.user);
    console.log('DEBUG Is authenticated:', req.isAuthenticated ? req.isAuthenticated() : false);
    
    // Validate request body
    const validatedData = insertBlogPostSchema.parse(req.body);
    
    // Generate slug if not provided
    if (!validatedData.slug) {
      validatedData.slug = generateSlug(validatedData.title);
    }
    
    // Check if slug already exists
    const existingPost = await storage.forms.getBlogPostBySlug(validatedData.slug);
    if (existingPost) {
      throw new ApiError('A blog post with this slug already exists', 400);
    }
    
    // Create the blog post with default user ID if req.user is undefined
    const newPost = await storage.forms.createBlogPost({
      ...validatedData,
      userId: req.user && (req.user as any).id ? (req.user as any).id : 1 // Default to admin user (ID 1)
    });
    
    res.status(201).json({ 
      success: true, 
      post: newPost
    });
  } catch (error) {
    next(error);
  }
});

// ADMIN: Update a blog post
router.put('/posts/:id', authenticateUser, authorizeAdmin, async (req, res, next) => {
  try {
    // Debug user object
    console.log('DEBUG User object in update route:', req.user);
    console.log('DEBUG Is authenticated in update route:', req.isAuthenticated ? req.isAuthenticated() : false);
    
    const { id } = req.params;
    const postId = parseInt(id, 10);
    
    if (isNaN(postId)) {
      throw new ApiError('Invalid post ID', 400);
    }
    
    // Check if post exists
    const existingPost = await storage.forms.getBlogPost(postId);
    if (!existingPost) {
      throw new ApiError('Blog post not found', 404);
    }
    
    // Validate request body
    const validationSchema = insertBlogPostSchema.partial();
    const validatedData = validationSchema.parse(req.body);
    
    // If slug is changing, check if the new slug already exists
    if (validatedData.slug && validatedData.slug !== existingPost.slug) {
      const postWithSlug = await storage.forms.getBlogPostBySlug(validatedData.slug);
      if (postWithSlug && postWithSlug.id !== postId) {
        throw new ApiError('A blog post with this slug already exists', 400);
      }
    }
    
    // If status is changing to published, set publishedAt
    if (validatedData.status === 'published' && existingPost.status !== 'published') {
      validatedData.publishedAt = new Date();
    }
    
    // Update the blog post
    const updatedPost = await storage.forms.updateBlogPost(postId, validatedData);
    
    res.json({ 
      success: true, 
      post: updatedPost
    });
  } catch (error) {
    next(error);
  }
});

// ADMIN: Delete a blog post
router.delete('/posts/:id', authenticateUser, authorizeAdmin, async (req, res, next) => {
  try {
    // Debug user object
    console.log('DEBUG User object in delete route:', req.user);
    console.log('DEBUG Is authenticated in delete route:', req.isAuthenticated ? req.isAuthenticated() : false);
    
    const { id } = req.params;
    const postId = parseInt(id, 10);
    
    if (isNaN(postId)) {
      throw new ApiError('Invalid post ID', 400);
    }
    
    // Check if post exists
    const existingPost = await storage.forms.getBlogPost(postId);
    if (!existingPost) {
      throw new ApiError('Blog post not found', 404);
    }
    
    // Delete the blog post
    await storage.forms.deleteBlogPost(postId);
    
    res.json({ 
      success: true, 
      message: 'Blog post deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Blog Subscriber Routes

// Subscribe to blog
router.post('/subscribe', async (req, res, next) => {
  try {
    // Validate request body
    const validatedData = insertBlogSubscriberSchema.parse(req.body);
    
    // Store IP and user agent for tracking
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    // Create the subscriber
    const subscriber = await storage.forms.createBlogSubscriber({
      ...validatedData,
      ipAddress: typeof ipAddress === 'string' ? ipAddress : undefined,
      userAgent: userAgent || undefined
    });
    
    res.status(201).json({ 
      success: true, 
      message: 'Subscribed successfully',
      subscriber
    });
  } catch (error) {
    next(error);
  }
});

// Unsubscribe from blog
router.get('/unsubscribe', async (req, res, next) => {
  try {
    const { email, token } = req.query;
    
    if (!email || typeof email !== 'string') {
      throw new ApiError('Email is required', 400);
    }
    
    // Get the subscriber
    const subscriber = await storage.forms.getBlogSubscriberByEmail(email);
    
    if (!subscriber) {
      throw new ApiError('Subscriber not found', 404);
    }
    
    // If token is provided, verify it
    if (token && subscriber.unsubscribeToken !== token) {
      throw new ApiError('Invalid unsubscribe token', 400);
    }
    
    // Unsubscribe
    await storage.forms.unsubscribeBlogSubscriber(email);
    
    res.json({ 
      success: true, 
      message: 'Unsubscribed successfully'
    });
  } catch (error) {
    next(error);
  }
});

// ADMIN: Get all blog subscribers
router.get('/subscribers', authenticateUser, authorizeAdmin, async (req, res, next) => {
  try {
    // Debug user object
    console.log('DEBUG User object in subscribers route:', req.user);
    console.log('DEBUG Is authenticated in subscribers route:', req.isAuthenticated ? req.isAuthenticated() : false);
    
    const subscribers = await storage.forms.getBlogSubscribers();
    
    res.json({ 
      success: true, 
      subscribers
    });
  } catch (error) {
    next(error);
  }
});

export default router;