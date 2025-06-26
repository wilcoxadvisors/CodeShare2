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
      'application/octet-stream' // Generic binary type that some browsers use
    ];
    
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    
    // Be strict about file validation: require proper extension AND compatible MIME type
    const isValidCsv = fileExtension === '.csv' && (file.mimetype === 'text/csv' || file.mimetype === 'application/csv' || file.mimetype === 'application/octet-stream');
    const isValidExcel = (fileExtension === '.xls' || fileExtension === '.xlsx') && (file.mimetype === 'application/vnd.ms-excel' || file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.mimetype === 'application/octet-stream');
    
    console.log('MULTER_DEBUG: isValidCsv:', isValidCsv);
    console.log('MULTER_DEBUG: isValidExcel:', isValidExcel);
    
    if (isValidCsv || isValidExcel) {
      console.log('MULTER_DEBUG: File accepted');
      cb(null, true);
    } else {
      console.log('MULTER_DEBUG: File rejected');
      cb(new Error('Invalid file type. Only .xlsx, .xls, and .csv are allowed.'));
    }
  },
});

export const multerMiddleware = upload.single('file');