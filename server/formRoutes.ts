import express, { Express, Request, Response } from "express";
import { DatabaseStorage, IStorage } from "./storage";
import { withTransaction, db } from "./db";

// Initialize storage instance
const storage: IStorage = new DatabaseStorage();
import { 
  insertContactSubmissionSchema, 
  insertChecklistSubmissionSchema, 
  insertConsultationSubmissionSchema,
  insertChecklistFileSchema,
  insertBlogSubscriberSchema,
  blogSubscribers
} from "@shared/schema";
import { validateRequest } from "@shared/validation";
import { asyncHandler, throwBadRequest } from "./errorHandling";
import nodemailer from "nodemailer";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { eq } from "drizzle-orm";

// Email notification configuration
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;

// Email transport setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASSWORD,
  },
});

// Helper function to send email notifications
async function sendEmailNotification(subject: string, text: string, recipient?: string) {
  if (!EMAIL_PASSWORD || !EMAIL_USER) {
    console.log("Email notifications disabled - email configuration not complete");
    return;
  }

  // If no specific recipient is provided, use the admin notification email
  const to = recipient || NOTIFICATION_EMAIL;
  
  if (!to) {
    console.log("No recipient email specified");
    return;
  }
  
  try {
    await transporter.sendMail({
      from: EMAIL_USER,
      to: to,
      subject,
      text,
    });
    console.log("Email notification sent successfully to", to);
  } catch (error) {
    console.error("Failed to send email notification:", error);
  }
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(), // Store files in memory
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB file size limit
  },
  fileFilter: (_req, file, cb) => {
    // Accept only PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

export function registerFormRoutes(app: Express) {
  // Contact Form Submission Route
  app.post("/api/contact", asyncHandler(async (req: Request, res: Response) => {
    console.log("Received contact form data:", req.body);
    
    // Validate the request
    const validation = validateRequest(insertContactSubmissionSchema, req.body);
    if (!validation.success) {
      console.error("Validation error:", validation.error);
      return throwBadRequest("Invalid contact form data", validation.error);
    }
    
    console.log("Validation successful, data:", validation.data);
    
    // Add IP and user agent
    const submission = {
      ...validation.data,
      ipAddress: req.ip || null,
      userAgent: req.headers["user-agent"] || null
    };
    
    console.log("Submission with IP and user agent:", submission);
    
    // Store the submission
    let result;
    try {
      console.log("Storing contact form in database...");
      result = await storage.forms.createContactSubmission(submission);
      console.log("Database storage result:", result);
    } catch (error) {
      console.error("Database storage error:", error);
      throw error;
    }
    
    // Send email notification
    await sendEmailNotification(
      "New Contact Form Submission",
      `New contact form submission from ${submission.name} (${submission.email}):\n\n${submission.message}`
    );
    
    res.status(201).json(result);
  }));
  
  // Checklist Form Submission Route
  app.post("/api/checklist", asyncHandler(async (req: Request, res: Response) => {
    console.log("Received checklist form data:", req.body);
    
    // Validate the request
    const validation = validateRequest(insertChecklistSubmissionSchema, req.body);
    if (!validation.success) {
      console.error("Validation error:", validation.error);
      return throwBadRequest("Invalid checklist form data", validation.error);
    }
    
    console.log("Validation successful, data:", validation.data);
    
    // Add IP and user agent
    const submission = {
      ...validation.data,
      ipAddress: req.ip || null,
      userAgent: req.headers["user-agent"] || null
    };
    
    console.log("Submission with IP and user agent:", submission);
    
    // Store the submission
    let result;
    try {
      console.log("Storing checklist form in database...");
      result = await storage.forms.createChecklistSubmission(submission);
      console.log("Database storage result:", result);
    } catch (error) {
      console.error("Database storage error:", error);
      throw error;
    }
    
    // Send email notification
    await sendEmailNotification(
      "New Checklist Form Submission",
      `New checklist form submission from ${submission.name} (${submission.email}):\n\nCompany: ${submission.company}\nRevenue Range: ${submission.revenueRange}`
    );
    
    // Include download URL with the response
    res.status(201).json({
      ...result,
      downloadUrl: "/files/financial_checklist.pdf"
    });
  }));
  
  // Serve the static PDF files
  app.use('/files', (req, res, next) => {
    console.log("Serving file:", req.path);
    next();
  }, express.static('public/files'));
  
  // Consultation Form Submission Route
  app.post("/api/consultation", asyncHandler(async (req: Request, res: Response) => {
    console.log("Received consultation form data:", req.body);
    
    // Validate the request
    const validation = validateRequest(insertConsultationSubmissionSchema, req.body);
    if (!validation.success) {
      console.error("Validation error:", validation.error);
      return throwBadRequest("Invalid consultation form data", validation.error);
    }
    
    console.log("Validation successful, data:", validation.data);
    
    // Add IP and user agent
    const submission = {
      ...validation.data,
      ipAddress: req.ip || null,
      userAgent: req.headers["user-agent"] || null
    };
    
    console.log("Submission with IP and user agent:", submission);
    console.log("Services type:", typeof submission.services, "Value:", submission.services);
    
    // Convert services array to JSON for database storage
    if (submission.services && Array.isArray(submission.services)) {
      submission.services = JSON.stringify(submission.services);
      console.log("Services after stringify:", submission.services);
    }
    
    // Store the submission
    let result;
    try {
      console.log("Storing consultation in database...");
      result = await storage.forms.createConsultationSubmission(submission);
      console.log("Database storage result:", result);
    } catch (error) {
      console.error("Database storage error:", error);
      throw error;
    }
    
    // Format selected services
    const services = Array.isArray(submission.services)
      ? submission.services.join(", ")
      : JSON.stringify(submission.services);
    
    // Send email notification
    await sendEmailNotification(
      "New Consultation Request",
      `New consultation request from ${submission.firstName} ${submission.lastName} (${submission.email}):\n\n` +
      `Company: ${submission.companyName}\n` +
      `Industry: ${submission.industry}\n` +
      `Company Size: ${submission.companySize}\n` +
      `Annual Revenue: ${submission.annualRevenue}\n` +
      `Services: ${services}\n` +
      `Preferred Contact: ${submission.preferredContact}\n` +
      `Phone: ${submission.phone || 'Not provided'}\n\n` +
      `Message: ${submission.message || 'No message provided'}`
    );
    
    res.status(201).json(result);
  }));
  
  // Admin Routes for Form Submissions
  
  // Get all contact submissions (admin only)
  app.get("/api/admin/contact-submissions", asyncHandler(async (req: Request, res: Response) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    
    const submissions = await storage.forms.getContactSubmissions(limit, offset);
    res.json(submissions);
  }));
  
  // Get a specific contact submission by ID (admin only)
  app.get("/api/admin/contact-submissions/:id", asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const submission = await storage.forms.getContactSubmission(id);
    
    if (!submission) {
      return res.status(404).json({ message: "Contact submission not found" });
    }
    
    res.json(submission);
  }));
  
  // Update contact submission status (admin only)
  app.patch("/api/admin/contact-submissions/:id", asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    
    if (!status || typeof status !== "string") {
      return throwBadRequest("Status is required and must be a string");
    }
    
    const updatedSubmission = await storage.forms.updateContactSubmission(id, { status });
    
    if (!updatedSubmission) {
      return res.status(404).json({ message: "Contact submission not found" });
    }
    
    res.json(updatedSubmission);
  }));
  
  // Get all checklist submissions (admin only)
  app.get("/api/admin/checklist-submissions", asyncHandler(async (req: Request, res: Response) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    
    const submissions = await storage.forms.getChecklistSubmissions(limit, offset);
    res.json(submissions);
  }));
  
  // Get a specific checklist submission by ID (admin only)
  app.get("/api/admin/checklist-submissions/:id", asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const submission = await storage.forms.getChecklistSubmission(id);
    
    if (!submission) {
      return res.status(404).json({ message: "Checklist submission not found" });
    }
    
    res.json(submission);
  }));
  
  // Update checklist submission status (admin only)
  app.patch("/api/admin/checklist-submissions/:id", asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    
    if (!status || typeof status !== "string") {
      return throwBadRequest("Status is required and must be a string");
    }
    
    const updatedSubmission = await storage.forms.updateChecklistSubmission(id, { status });
    
    if (!updatedSubmission) {
      return res.status(404).json({ message: "Checklist submission not found" });
    }
    
    res.json(updatedSubmission);
  }));
  
  // Get all consultation submissions (admin only)
  app.get("/api/admin/consultation-submissions", asyncHandler(async (req: Request, res: Response) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    
    const submissions = await storage.forms.getConsultationSubmissions(limit, offset);
    res.json(submissions);
  }));
  
  // Get a specific consultation submission by ID (admin only)
  app.get("/api/admin/consultation-submissions/:id", asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const submission = await storage.forms.getConsultationSubmission(id);
    
    if (!submission) {
      return res.status(404).json({ message: "Consultation submission not found" });
    }
    
    res.json(submission);
  }));
  
  // Update consultation submission status (admin only)
  app.patch("/api/admin/consultation-submissions/:id", asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    
    if (!status || typeof status !== "string") {
      return throwBadRequest("Status is required and must be a string");
    }
    
    const updatedSubmission = await storage.forms.updateConsultationSubmission(id, { status });
    
    if (!updatedSubmission) {
      return res.status(404).json({ message: "Consultation submission not found" });
    }
    
    res.json(updatedSubmission);
  }));
  
  // Checklist PDF File Management Routes (admin only)
  
  // Upload a new checklist PDF file
  app.post("/api/admin/checklist-files", upload.single('file'), asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      return throwBadRequest("No file uploaded");
    }
    
    // Check if this should be the active file
    const isActive = req.body.isActive === 'true';
    
    // Get file details
    const fileData = {
      filename: req.file.originalname,
      originalFilename: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: req.file.originalname, // Just storing the name as path
      // Add fileData as a non-schema field that will be handled separately
      fileData: req.file.buffer,  // Store the file in the database
      isActive: isActive,
      uploadedBy: null // In a real app, this would be set to the current user ID
    };
    
    // Store the file in the database using a transaction for data integrity
    const result = await withTransaction(async (tx: typeof db) => {
      // Create the file entry in the database within a transaction
      const file = await storage.createChecklistFile(fileData);
      
      // If this is marked as active, deactivate all other files
      if (isActive) {
        // Get the current active files (excluding the one we just created)
        const activeFiles = await storage.getChecklistFiles();
        
        // Deactivate all other files
        for (const activeFile of activeFiles) {
          if (activeFile.id !== file.id && activeFile.isActive) {
            await storage.updateChecklistFile(activeFile.id, false);
          }
        }
      }
      
      return file;
    });
    
    // Send email notification
    await sendEmailNotification(
      "New Checklist PDF Uploaded",
      `A new checklist PDF file "${fileData.filename}" has been uploaded to the system.` +
      `\nFile size: ${Math.round(fileData.size / 1024)} KB` +
      `\nIs active: ${isActive ? 'Yes' : 'No'}`
    );
    
    res.status(201).json({
      id: result.id,
      filename: result.filename,
      originalFilename: result.originalFilename,
      mimeType: result.mimeType,
      size: result.size,
      isActive: result.isActive,
      createdAt: result.createdAt
    });
  }));
  
  // Get all checklist files (admin only)
  app.get("/api/admin/checklist-files", asyncHandler(async (req: Request, res: Response) => {
    const files = await storage.getChecklistFiles();
    
    // Don't return the actual file data in the list
    const filesWithoutData = files.map(file => ({
      id: file.id,
      filename: file.filename,
      originalFilename: file.originalFilename,
      mimeType: file.mimeType,
      size: file.size,
      isActive: file.isActive,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt
    }));
    
    res.json(filesWithoutData);
  }));
  
  // Get the active checklist file
  app.get("/api/checklist-file", asyncHandler(async (req: Request, res: Response) => {
    const file = await storage.getActiveChecklistFile();
    
    if (!file) {
      return res.status(404).json({ message: "No active checklist file found" });
    }
    
    // Set content-type and disposition headers
    res.contentType(file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    
    // Note: The storage implementation should add the fileData property to the file object
    // after retrieving it from the database. This is a non-schema field that's handled specially.
    // @ts-ignore: fileData is added by the storage implementation
    res.send(file.fileData);
  }));
  
  // Get a specific checklist file by ID (admin only)
  app.get("/api/admin/checklist-files/:id", asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const file = await storage.getChecklistFileById(id);
    
    if (!file) {
      return res.status(404).json({ message: "Checklist file not found" });
    }
    
    // Set content-type and disposition headers
    res.contentType(file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    
    // Note: The storage implementation should add the fileData property to the file object
    // after retrieving it from the database. This is a non-schema field that's handled specially.
    // @ts-ignore: fileData is added by the storage implementation
    res.send(file.fileData);
  }));
  
  // Update checklist file status (set active/inactive) (admin only)
  app.patch("/api/admin/checklist-files/:id", asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const { isActive } = req.body;
    
    if (isActive === undefined || typeof isActive !== "boolean") {
      return throwBadRequest("isActive is required and must be a boolean");
    }
    
    // Use transaction to ensure data integrity when updating file status
    const updatedFile = await withTransaction(async (tx: typeof db) => {
      // If setting this file as active, deactivate all other files
      if (isActive) {
        // Get the current active files 
        const activeFiles = await storage.getChecklistFiles();
        
        // Deactivate all other files
        for (const activeFile of activeFiles) {
          if (activeFile.id !== id && activeFile.isActive) {
            await storage.updateChecklistFile(activeFile.id, false);
          }
        }
      }
      
      // Update this file's status
      const result = await storage.updateChecklistFile(id, isActive);
      return result;
    });
    
    if (!updatedFile) {
      return res.status(404).json({ message: "Checklist file not found" });
    }
    
    res.json({
      id: updatedFile.id,
      filename: updatedFile.filename,
      originalFilename: updatedFile.originalFilename,
      mimeType: updatedFile.mimeType,
      size: updatedFile.size,
      isActive: updatedFile.isActive,
      createdAt: updatedFile.createdAt,
      updatedAt: updatedFile.updatedAt
    });
  }));
  
  // Delete a checklist file (admin only)
  app.delete("/api/admin/checklist-files/:id", asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    
    // Check if file exists
    const file = await storage.getChecklistFileById(id);
    if (!file) {
      return res.status(404).json({ message: "Checklist file not found" });
    }
    
    // Use transaction to ensure data integrity when deleting a file
    await withTransaction(async (tx: typeof db) => {
      // If this is the active file, we need to be careful
      if (file.isActive) {
        // Find another file to set as active (if any)
        const otherFiles = await storage.getChecklistFiles();
        const alternativeFile = otherFiles.find(f => f.id !== id);
        
        // If there's another file, make it active
        if (alternativeFile) {
          await storage.updateChecklistFile(alternativeFile.id, true);
        }
      }
      
      // Now delete the file
      await storage.deleteChecklistFile(id);
    });
    
    // Send email notification
    await sendEmailNotification(
      "Checklist PDF Deleted",
      `A checklist PDF file "${file.filename}" has been deleted from the system.`
    );
    
    res.status(204).end();
  }));

  // Blog Subscriber Routes

  // Helper function to generate random token
  function generateVerificationToken(): string {
    // Use a secure random method for token generation
    return crypto.randomBytes(32).toString('hex');
  }
  
  // Helper function to send verification email
  async function sendVerificationEmail(email: string, name: string | null, token: string): Promise<void> {
    const verificationLink = `${process.env.APP_URL || 'http://localhost:5000'}/api/blog/verify?token=${token}`;
    
    const emailContent = `
    Hello ${name || 'there'},
    
    Thank you for subscribing to our blog updates. Please confirm your subscription by clicking the link below:
    
    ${verificationLink}
    
    If you did not request this subscription, you can safely ignore this email.
    
    Best regards,
    Wilcox Advisors Team
    `;
    
    // Send the verification email directly to the subscriber
    await sendEmailNotification(
      "Confirm Your Blog Subscription",
      emailContent,
      email
    );
  }

  // Subscribe to blog updates with double opt-in
  app.post("/api/blog/subscribe", asyncHandler(async (req: Request, res: Response) => {
    console.log("Received blog subscription:", req.body);
    
    // Validate the request
    const validation = validateRequest(insertBlogSubscriberSchema, req.body);
    if (!validation.success) {
      console.error("Validation error:", validation.error);
      return throwBadRequest("Invalid subscription data", validation.error);
    }
    
    // Check if the email already exists
    const existingSubscriber = await storage.forms.getBlogSubscriberByEmail(validation.data.email);
    if (existingSubscriber) {
      // If already subscribed, confirmed and active, just return success
      if (existingSubscriber.active && existingSubscriber.confirmed) {
        return res.json({
          message: "You're already subscribed to our blog updates",
          subscribed: true
        });
      }
      
      // If subscription exists but not confirmed, resend verification email
      if (!existingSubscriber.confirmed) {
        // Generate new verification token
        const verificationToken = generateVerificationToken();
        const verificationExpires = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours from now
        
        // Update with new verification token
        const updatedSubscriber = await storage.updateBlogSubscriber(existingSubscriber.id, {
          verificationToken,
          verificationExpires,
          active: true
        });
        
        // Send verification email
        await sendVerificationEmail(
          updatedSubscriber.email,
          updatedSubscriber.name,
          verificationToken
        );
        
        return res.json({
          message: "Please check your email to confirm your subscription",
          subscribed: false,
          pendingConfirmation: true
        });
      }
      
      // If inactive but confirmed previously, just reactivate
      if (!existingSubscriber.active && existingSubscriber.confirmed) {
        const updatedSubscriber = await storage.updateBlogSubscriber(existingSubscriber.id, {
          active: true,
          unsubscribedAt: null
        });
        
        // Send welcome back email
        await sendEmailNotification(
          "Blog Subscription Reactivated",
          `Thank you for reactivating your subscription to our blog updates.`,
          updatedSubscriber.email
        );
        
        return res.json({
          message: "Your subscription has been reactivated",
          subscribed: true
        });
      }
    }
    
    // Generate unique tokens
    const verificationToken = generateVerificationToken();
    const unsubscribeToken = generateVerificationToken();
    const verificationExpires = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours from now
    
    // Add IP, user agent, and tokens to subscriber data
    const subscriber = {
      ...validation.data,
      ipAddress: req.ip || null,
      userAgent: req.headers["user-agent"] || null,
      verificationToken,
      verificationExpires,
      unsubscribeToken,
      confirmed: false
    };
    
    // Store the new subscription
    const result = await storage.createBlogSubscriber(subscriber);
    
    // Send verification email
    await sendVerificationEmail(result.email, result.name, verificationToken);
    
    // Send notification to admin
    await sendEmailNotification(
      "New Blog Subscription Request",
      `New blog subscription request from ${result.email}\nName: ${result.name || 'Not provided'}\nPending confirmation.`,
      process.env.ADMIN_EMAIL
    );
    
    // Return success but make it clear confirmation is needed
    res.status(201).json({
      message: "Please check your email to confirm your subscription",
      subscribed: false,
      pendingConfirmation: true
    });
  }));

  // Verify email subscription (from email link)
  app.get("/api/blog/verify", asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.query;
    
    if (!token || typeof token !== "string") {
      return res.redirect("/blog?verification=failed&reason=missing_token");
    }
    
    // Find subscriber with this verification token
    const subscribers = await db
      .select()
      .from(blogSubscribers)
      .where(eq(blogSubscribers.verificationToken, token))
      .limit(1);
    
    if (subscribers.length === 0) {
      return res.redirect("/blog?verification=failed&reason=invalid_token");
    }
    
    const subscriber = subscribers[0];
    
    // Check if token has expired
    if (subscriber.verificationExpires && subscriber.verificationExpires < new Date()) {
      return res.redirect("/blog?verification=failed&reason=token_expired");
    }
    
    // Update subscriber to confirmed
    await storage.updateBlogSubscriber(subscriber.id, {
      confirmed: true,
      confirmedAt: new Date(),
      verificationToken: null, // Clear the token after use
      active: true
    });
    
    // Send welcome email
    await sendEmailNotification(
      "Welcome to Wilcox Advisors Blog!",
      `
      Hello ${subscriber.name || 'there'},
      
      Thank you for confirming your subscription to our blog. You will now receive updates whenever we publish new content.
      
      You can unsubscribe at any time by clicking the unsubscribe link in our emails or by visiting our website.
      
      Best regards,
      Wilcox Advisors Team
      `,
      subscriber.email
    );
    
    // Notify admin
    await sendEmailNotification(
      "Blog Subscription Confirmed",
      `A subscriber has confirmed their blog subscription: ${subscriber.email}`,
      process.env.ADMIN_EMAIL
    );
    
    // Redirect to confirmation page
    return res.redirect("/blog?verification=success");
  }));

  // Unsubscribe from blog updates
  app.post("/api/blog/unsubscribe", asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;
    
    if (!email || typeof email !== "string") {
      return throwBadRequest("Email is required");
    }
    
    // Find the subscriber
    const subscriber = await storage.forms.getBlogSubscriberByEmail(email);
    
    if (!subscriber) {
      return res.status(404).json({
        message: "Email not found in our subscriber list",
        unsubscribed: false
      });
    }
    
    // Update to inactive
    await storage.updateBlogSubscriber(subscriber.id, {
      active: false,
      unsubscribedAt: new Date()
    });
    
    res.json({
      message: "Successfully unsubscribed from blog updates",
      unsubscribed: true
    });
  }));
  
  // Unsubscribe from blog updates via token (direct link from email)
  app.get("/api/blog/unsubscribe", asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.query;
    
    if (!token || typeof token !== "string") {
      return res.redirect("/blog?unsubscribe=failed&reason=missing_token");
    }
    
    // Find subscriber with this unsubscribe token
    const subscribers = await db
      .select()
      .from(blogSubscribers)
      .where(eq(blogSubscribers.unsubscribeToken, token))
      .limit(1);
    
    if (subscribers.length === 0) {
      return res.redirect("/blog?unsubscribe=failed&reason=invalid_token");
    }
    
    const subscriber = subscribers[0];
    
    // Update to inactive
    await storage.updateBlogSubscriber(subscriber.id, {
      active: false,
      unsubscribedAt: new Date()
    });
    
    // Redirect to confirmation page
    return res.redirect("/blog?unsubscribe=success");
  }));

  // Get all blog subscribers (admin only)
  app.get("/api/admin/blog-subscribers", asyncHandler(async (req: Request, res: Response) => {
    const includeInactive = req.query.includeInactive === 'true';
    const subscribers = await storage.forms.getBlogSubscribers(includeInactive);
    res.json(subscribers);
  }));

  // Delete a blog subscriber (admin only)
  app.delete("/api/admin/blog-subscribers/:id", asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    await storage.deleteBlogSubscriber(id);
    res.status(204).end();
  }));
}