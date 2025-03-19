import { Express, Request, Response } from "express";
import { storage } from "./storage";
import { 
  insertContactSubmissionSchema, 
  insertChecklistSubmissionSchema, 
  insertConsultationSubmissionSchema,
  insertChecklistFileSchema
} from "@shared/schema";
import { validateRequest } from "@shared/validation";
import { asyncHandler, throwBadRequest } from "./errorHandling";
import nodemailer from "nodemailer";
import multer from "multer";
import path from "path";
import fs from "fs";

// Email notification configuration
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || "garrettwilcox40@gmail.com";
const EMAIL_USER = process.env.EMAIL_USER || "garrettwilcox40@gmail.com";
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD || "ywphiyzovqteiziu";

// Email transport setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASSWORD,
  },
});

// Helper function to send email notifications
async function sendEmailNotification(subject: string, text: string) {
  if (!EMAIL_PASSWORD) {
    console.log("Email notifications disabled - password not set");
    return;
  }
  
  try {
    await transporter.sendMail({
      from: EMAIL_USER,
      to: NOTIFICATION_EMAIL,
      subject,
      text,
    });
    console.log("Email notification sent successfully");
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
    // Validate the request
    const validation = validateRequest(insertContactSubmissionSchema, req.body);
    if (!validation.success) {
      return throwBadRequest("Invalid contact form data", validation.error);
    }
    
    // Add IP and user agent
    const submission = {
      ...validation.data,
      ipAddress: req.ip || null,
      userAgent: req.headers["user-agent"] || null
    };
    
    // Store the submission
    const result = await storage.createContactSubmission(submission);
    
    // Send email notification
    await sendEmailNotification(
      "New Contact Form Submission",
      `New contact form submission from ${submission.name} (${submission.email}):\n\n${submission.message}`
    );
    
    res.status(201).json(result);
  }));
  
  // Checklist Form Submission Route
  app.post("/api/checklist", asyncHandler(async (req: Request, res: Response) => {
    // Validate the request
    const validation = validateRequest(insertChecklistSubmissionSchema, req.body);
    if (!validation.success) {
      return throwBadRequest("Invalid checklist form data", validation.error);
    }
    
    // Add IP and user agent
    const submission = {
      ...validation.data,
      ipAddress: req.ip || null,
      userAgent: req.headers["user-agent"] || null
    };
    
    // Store the submission
    const result = await storage.createChecklistSubmission(submission);
    
    // Send email notification
    await sendEmailNotification(
      "New Checklist Form Submission",
      `New checklist form submission from ${submission.name} (${submission.email}):\n\nCompany: ${submission.company}\nRevenue Range: ${submission.revenueRange}`
    );
    
    res.status(201).json(result);
  }));
  
  // Consultation Form Submission Route
  app.post("/api/consultation", asyncHandler(async (req: Request, res: Response) => {
    // Validate the request
    const validation = validateRequest(insertConsultationSubmissionSchema, req.body);
    if (!validation.success) {
      return throwBadRequest("Invalid consultation form data", validation.error);
    }
    
    // Add IP and user agent
    const submission = {
      ...validation.data,
      ipAddress: req.ip || null,
      userAgent: req.headers["user-agent"] || null
    };
    
    // Convert services array to JSON for database storage
    if (submission.services && Array.isArray(submission.services)) {
      submission.services = JSON.stringify(submission.services);
    }
    
    // Store the submission
    const result = await storage.createConsultationSubmission(submission);
    
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
    
    const submissions = await storage.getContactSubmissions(limit, offset);
    res.json(submissions);
  }));
  
  // Get a specific contact submission by ID (admin only)
  app.get("/api/admin/contact-submissions/:id", asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const submission = await storage.getContactSubmissionById(id);
    
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
    
    const updatedSubmission = await storage.updateContactSubmission(id, status);
    
    if (!updatedSubmission) {
      return res.status(404).json({ message: "Contact submission not found" });
    }
    
    res.json(updatedSubmission);
  }));
  
  // Get all checklist submissions (admin only)
  app.get("/api/admin/checklist-submissions", asyncHandler(async (req: Request, res: Response) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    
    const submissions = await storage.getChecklistSubmissions(limit, offset);
    res.json(submissions);
  }));
  
  // Get a specific checklist submission by ID (admin only)
  app.get("/api/admin/checklist-submissions/:id", asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const submission = await storage.getChecklistSubmissionById(id);
    
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
    
    const updatedSubmission = await storage.updateChecklistSubmission(id, status);
    
    if (!updatedSubmission) {
      return res.status(404).json({ message: "Checklist submission not found" });
    }
    
    res.json(updatedSubmission);
  }));
  
  // Get all consultation submissions (admin only)
  app.get("/api/admin/consultation-submissions", asyncHandler(async (req: Request, res: Response) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    
    const submissions = await storage.getConsultationSubmissions(limit, offset);
    res.json(submissions);
  }));
  
  // Get a specific consultation submission by ID (admin only)
  app.get("/api/admin/consultation-submissions/:id", asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const submission = await storage.getConsultationSubmissionById(id);
    
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
    
    const updatedSubmission = await storage.updateConsultationSubmission(id, status);
    
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
      fileData: req.file.buffer,  // Store the file in the database
      isActive: isActive,
      uploadedBy: null // In a real app, this would be set to the current user ID
    };
    
    // Store the file in the database
    const result = await storage.createChecklistFile(fileData);
    
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
    
    // Send the file data
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
    
    // Send the file data
    res.send(file.fileData);
  }));
  
  // Update checklist file status (set active/inactive) (admin only)
  app.patch("/api/admin/checklist-files/:id", asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const { isActive } = req.body;
    
    if (isActive === undefined || typeof isActive !== "boolean") {
      return throwBadRequest("isActive is required and must be a boolean");
    }
    
    const updatedFile = await storage.updateChecklistFile(id, isActive);
    
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
    
    // Delete the file
    await storage.deleteChecklistFile(id);
    
    // Send email notification
    await sendEmailNotification(
      "Checklist PDF Deleted",
      `A checklist PDF file "${file.filename}" has been deleted from the system.`
    );
    
    res.status(204).end();
  }));
}