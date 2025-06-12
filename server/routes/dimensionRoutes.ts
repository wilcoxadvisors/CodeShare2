// In server/routes/dimensionRoutes.ts

import { Router } from 'express';
import { asyncHandler, throwBadRequest } from '../errorHandling';
import { dimensionStorage } from '../storage/dimensionStorage';
import { isAuthenticated } from '../auth';
import multer from 'multer';
import * as Papa from 'papaparse';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

// --- Dimension Routes ---

// GET all dimensions and their values for a specific client
router.get('/clients/:clientId/dimensions', isAuthenticated, asyncHandler(async (req, res) => {
    const clientId = parseInt(req.params.clientId, 10);
    if (isNaN(clientId)) {
        return throwBadRequest('A valid client ID is required.');
    }
    const allDimensions = await dimensionStorage.getDimensionsByClient(clientId);
    res.status(200).json({ data: allDimensions });
}));

// POST (create) a new dimension for a client
router.post('/clients/:clientId/dimensions', isAuthenticated, asyncHandler(async (req, res) => {
    const clientId = parseInt(req.params.clientId, 10);
    if (isNaN(clientId)) {
        return throwBadRequest('A valid client ID is required.');
    }
    // Assuming the request body contains { code, name, description }
    const newDimension = await dimensionStorage.createDimension({ ...req.body, clientId });
    res.status(201).json(newDimension);
}));

// PUT (update) an existing dimension
router.put('/dimensions/:id', isAuthenticated, asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return throwBadRequest('A valid dimension ID is required.');
    }
    const updatedDimension = await dimensionStorage.updateDimension(id, req.body);
    res.status(200).json(updatedDimension);
}));

// DELETE an existing dimension
router.delete('/dimensions/:id', isAuthenticated, asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return throwBadRequest('A valid dimension ID is required.');
    }
    await dimensionStorage.deleteDimension(id);
    res.status(204).send();
}));


// --- Dimension Value Routes ---

// POST (create) a new value for a specific dimension
router.post('/dimensions/:dimensionId/values', isAuthenticated, asyncHandler(async (req, res) => {
    const dimensionId = parseInt(req.params.dimensionId, 10);
    if (isNaN(dimensionId)) {
        return throwBadRequest('A valid dimension ID is required.');
    }
    // Assuming the request body contains { code, name, description }
    const newValue = await dimensionStorage.createDimensionValue({ ...req.body, dimensionId });
    res.status(201).json(newValue);
}));

// PUT (update) an existing dimension value
router.put('/dimension-values/:id', isAuthenticated, asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return throwBadRequest('A valid dimension value ID is required.');
    }
    const updatedValue = await dimensionStorage.updateDimensionValue(id, req.body);
    res.status(200).json(updatedValue);
}));

// DELETE an existing dimension value
router.delete('/dimension-values/:id', isAuthenticated, asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return throwBadRequest('A valid dimension value ID is required.');
    }
    await dimensionStorage.deleteDimensionValue(id);
    res.status(204).send();
}));

// POST (batch upload) dimension values from CSV file
router.post('/dimensions/:dimensionId/values/batch-upload', 
    isAuthenticated, 
    upload.single('file'), 
    asyncHandler(async (req, res) => {
        const dimensionId = parseInt(req.params.dimensionId, 10);
        if (isNaN(dimensionId)) {
            return throwBadRequest('A valid dimension ID is required.');
        }

        if (!req.file) {
            return throwBadRequest('A CSV file is required.');
        }

        try {
            // Parse CSV file
            const csvText = req.file.buffer.toString('utf8');
            const parseResult = Papa.parse<Record<string, any>>(csvText, {
                header: true,
                skipEmptyLines: true,
                transform: (value: string) => value.trim()
            });

            if (parseResult.errors && parseResult.errors.length > 0) {
                return throwBadRequest(`CSV parsing error: ${parseResult.errors[0].message}`);
            }

            const data = parseResult.data;
            
            // Validate CSV headers
            const requiredHeaders = ['code', 'name'];
            const headers = parseResult.meta?.fields || [];
            
            const missingHeaders = requiredHeaders.filter(header => 
                !headers.some((h: string) => h.toLowerCase() === header.toLowerCase())
            );
            
            if (missingHeaders.length > 0) {
                return throwBadRequest(`Missing required CSV headers: ${missingHeaders.join(', ')}. Expected headers: code, name`);
            }

            // Validate and clean data
            const validatedValues: { code: string; name: string; description?: string }[] = [];
            const errors: string[] = [];

            data.forEach((row, index) => {
                const rowNumber = index + 2; // +2 because index is 0-based and we skip header row
                
                // Get values case-insensitively
                const code = row.code || row.Code || row.CODE || '';
                const name = row.name || row.Name || row.NAME || '';
                const description = row.description || row.Description || row.DESCRIPTION || '';

                if (!code || !name) {
                    errors.push(`Row ${rowNumber}: Both 'code' and 'name' are required`);
                    return;
                }

                if (code.length > 50) {
                    errors.push(`Row ${rowNumber}: Code must be 50 characters or less`);
                    return;
                }

                if (name.length > 255) {
                    errors.push(`Row ${rowNumber}: Name must be 255 characters or less`);
                    return;
                }

                validatedValues.push({
                    code: code.toString(),
                    name: name.toString(),
                    description: description ? description.toString() : undefined
                });
            });

            if (errors.length > 0) {
                return throwBadRequest(`Validation errors:\n${errors.join('\n')}`);
            }

            if (validatedValues.length === 0) {
                return throwBadRequest('No valid data rows found in CSV file.');
            }

            // Check for duplicate codes within the CSV
            const csvCodes = validatedValues.map(v => v.code);
            const duplicatesInCsv = csvCodes.filter((code, index) => csvCodes.indexOf(code) !== index);
            
            if (duplicatesInCsv.length > 0) {
                return throwBadRequest(`Duplicate codes found in CSV: ${Array.from(new Set(duplicatesInCsv)).join(', ')}`);
            }

            // Create dimension values using storage method
            const result = await dimensionStorage.createManyDimensionValues(dimensionId, validatedValues);
            
            res.status(201).json(result);

        } catch (error: any) {
            console.error('Error processing CSV upload:', error);
            return throwBadRequest(`Failed to process CSV file: ${error.message}`);
        }
    })
);

// GET (download) CSV template with existing dimension values
router.get('/dimensions/:dimensionId/values/csv-template', 
    isAuthenticated, 
    asyncHandler(async (req, res) => {
        const dimensionId = parseInt(req.params.dimensionId, 10);
        if (isNaN(dimensionId)) {
            return throwBadRequest('A valid dimension ID is required.');
        }

        // Get the dimension directly by ID to verify it exists
        const dimension = await dimensionStorage.getDimensionById(dimensionId);
        
        if (!dimension) {
            return res.status(404).json({ message: 'Dimension not found' });
        }

        // Get all existing values for this dimension
        const existingValues = dimension.values || [];
        
        // Prepare data for CSV export
        const csvData = existingValues.map(value => ({
            code: value.code,
            name: value.name,
            description: value.description || ''
        }));

        // If no values exist, provide a sample template
        if (csvData.length === 0) {
            csvData.push({
                code: 'SAMPLE01',
                name: 'Sample Value 1',
                description: 'This is a sample dimension value'
            });
        }

        // Convert to CSV using Papa.parse unparse function
        const csv = Papa.unparse(csvData, {
            header: true,
            columns: ['code', 'name', 'description']
        });

        // Set response headers for file download
        const filename = `${dimension.name.toLowerCase().replace(/\s+/g, '_')}_values_template.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        res.status(200).send(csv);
    })
);

export default router;