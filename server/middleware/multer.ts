import multer from 'multer';

// Configure multer to use memory storage. This is efficient for processing
// and avoids writing temporary files to disk.
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB file size limit
  },
  fileFilter: (req, file, cb) => {
    // Be strict about file validation: require proper extension AND compatible MIME type
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    const isValidCsv = fileExtension === '.csv' && (file.mimetype === 'text/csv' || file.mimetype === 'application/csv' || file.mimetype === 'application/octet-stream');
    const isValidExcel = (fileExtension === '.xls' || fileExtension === '.xlsx') && (file.mimetype === 'application/vnd.ms-excel' || file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.mimetype === 'application/octet-stream');
    
    if (isValidCsv || isValidExcel) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only .xlsx, .xls, and .csv are allowed.'));
    }
  },
});

export const multerMiddleware = upload.single('file');