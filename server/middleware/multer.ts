import multer from 'multer';

// Configure multer to use memory storage. This is efficient for processing
// and avoids writing temporary files to disk.
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB file size limit
  },
  fileFilter: (req, file, cb) => {
    console.log('MULTER_DEBUG: File upload attempt:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      fieldname: file.fieldname
    });
    
    // Accept excel and CSV file types (including common MIME type variations)
    const allowedMimeTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/csv',
      'text/plain', // Sometimes CSV files are detected as plain text
      'application/octet-stream' // Generic binary type that some browsers use
    ];
    
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    
    console.log('MULTER_DEBUG: File extension:', fileExtension);
    console.log('MULTER_DEBUG: MIME type check:', allowedMimeTypes.includes(file.mimetype));
    console.log('MULTER_DEBUG: Extension check:', allowedExtensions.includes(fileExtension));
    
    if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      console.log('MULTER_DEBUG: File accepted');
      cb(null, true);
    } else {
      console.log('MULTER_DEBUG: File rejected');
      cb(new Error('Invalid file type. Only .xlsx, .xls, and .csv are allowed.'));
    }
  },
});

export const multerMiddleware = upload.single('file');