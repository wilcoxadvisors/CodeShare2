import express from 'express';
import { insertHomepageContentSchema, InsertHomepageContent } from '../../shared/schema';
import { validateAdmin } from '../authMiddleware';
import { z } from 'zod';

const router = express.Router();

// Middleware to parse JSON request bodies
router.use(express.json());

/**
 * @route GET /api/content/homepage
 * @description Get all homepage content sections
 * @access Public
 */
router.get('/homepage', async (req, res) => {
  try {
    const homepageContents = await req.app.locals.storage.content.listHomepageContents();
    return res.status(200).json({ 
      success: true, 
      data: homepageContents 
    });
  } catch (error) {
    console.error('Error fetching homepage content:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch homepage content',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * @route GET /api/content/homepage/:id
 * @description Get homepage content by ID
 * @access Public
 */
router.get('/homepage/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid ID format' 
      });
    }
    
    const homepageContent = await req.app.locals.storage.content.getHomepageContentById(id);
    if (!homepageContent) {
      return res.status(404).json({ 
        success: false, 
        message: 'Homepage content not found' 
      });
    }
    
    return res.status(200).json({ 
      success: true, 
      data: homepageContent 
    });
  } catch (error) {
    console.error('Error fetching homepage content by ID:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch homepage content',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * @route GET /api/content/homepage/section/:section
 * @description Get homepage content by section
 * @access Public
 */
router.get('/homepage/section/:section', async (req, res) => {
  try {
    const section = req.params.section;
    
    const homepageContents = await req.app.locals.storage.content.getHomepageContentBySection(section);
    
    return res.status(200).json({ 
      success: true, 
      data: homepageContents 
    });
  } catch (error) {
    console.error('Error fetching homepage content by section:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch homepage content',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * @route POST /api/content/homepage
 * @description Create a new homepage content section
 * @access Admin only
 */
router.post('/homepage', validateAdmin, async (req, res) => {
  try {
    // Create a schema for validation with extended requirements
    const homepageContentSchema = z.object({
      section: z.string().min(1, "Section name is required"),
      title: z.string().min(1, "Title is required"),
      content: z.string().min(1, "Content is required"),
      displayOrder: z.number().int().default(0),
      imageUrl: z.string().optional().nullable(),
      metaTitle: z.string().optional().nullable(),
      metaDescription: z.string().optional().nullable()
    });
    
    // Validate request body
    const validationResult = homepageContentSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed', 
        errors: validationResult.error.errors 
      });
    }
    
    const homepageContent = await req.app.locals.storage.content.createHomepageContent(validationResult.data as InsertHomepageContent);
    
    return res.status(201).json({ 
      success: true, 
      message: 'Homepage content created successfully',
      data: homepageContent 
    });
  } catch (error) {
    console.error('Error creating homepage content:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to create homepage content',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * @route PUT /api/content/homepage/:id
 * @description Update homepage content
 * @access Admin only
 */
router.put('/homepage/:id', validateAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid ID format' 
      });
    }
    
    // Check if content exists
    const existingContent = await req.app.locals.storage.content.getHomepageContentById(id);
    if (!existingContent) {
      return res.status(404).json({ 
        success: false, 
        message: 'Homepage content not found' 
      });
    }
    
    // Create a schema for validation with extended requirements
    const updateHomepageContentSchema = z.object({
      section: z.string().min(1, "Section name is required").optional(),
      title: z.string().min(1, "Title is required").optional(),
      content: z.string().min(1, "Content is required").optional(),
      displayOrder: z.number().int().optional(),
      imageUrl: z.string().optional().nullable(),
      metaTitle: z.string().optional().nullable(),
      metaDescription: z.string().optional().nullable()
    });
    
    // Validate request body
    const validationResult = updateHomepageContentSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed', 
        errors: validationResult.error.errors 
      });
    }
    
    const updatedContent = await req.app.locals.storage.content.updateHomepageContent(id, validationResult.data);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Homepage content updated successfully',
      data: updatedContent 
    });
  } catch (error) {
    console.error('Error updating homepage content:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to update homepage content',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * @route DELETE /api/content/homepage/:id
 * @description Delete homepage content
 * @access Admin only
 */
router.delete('/homepage/:id', validateAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid ID format' 
      });
    }
    
    // Check if content exists
    const existingContent = await req.app.locals.storage.content.getHomepageContentById(id);
    if (!existingContent) {
      return res.status(404).json({ 
        success: false, 
        message: 'Homepage content not found' 
      });
    }
    
    const deleted = await req.app.locals.storage.content.deleteHomepageContent(id);
    
    if (!deleted) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to delete homepage content' 
      });
    }
    
    return res.status(200).json({ 
      success: true, 
      message: 'Homepage content deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting homepage content:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to delete homepage content',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;