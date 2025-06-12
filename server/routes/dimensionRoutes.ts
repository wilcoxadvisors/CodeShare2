// In server/routes/dimensionRoutes.ts

import { Router } from 'express';
import { asyncHandler, throwBadRequest } from '../errorHandling';
import { dimensionStorage } from '../storage/dimensionStorage';
import { isAuthenticated } from '../auth';
import multer from 'multer';
import Papa from 'papaparse';

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
        console.log(`[CSV Template] Starting download for dimension ID: ${req.params.dimensionId}`);
        
        const dimensionId = parseInt(req.params.dimensionId, 10);
        if (isNaN(dimensionId)) {
            console.error(`[CSV Template] Invalid dimension ID: ${req.params.dimensionId}`);
            return throwBadRequest('A valid dimension ID is required.');
        }

        console.log(`[CSV Template] Fetching dimension ${dimensionId} from storage...`);
        // Get the dimension directly by ID to verify it exists
        const dimension = await dimensionStorage.getDimensionById(dimensionId);
        
        if (!dimension) {
            console.error(`[CSV Template] Dimension ${dimensionId} not found in database`);
            return res.status(404).json({ message: 'Dimension not found' });
        }

        console.log(`[CSV Template] Found dimension: ${dimension.name} (ID: ${dimension.id})`);
        console.log(`[CSV Template] Dimension has ${dimension.values?.length || 0} existing values`);

        // Get all existing values for this dimension
        const existingValues = dimension.values || [];
        
        // Prepare data for CSV export
        const csvData = existingValues.map(value => ({
            code: value.code,
            name: value.name,
            description: value.description || ''
        }));

        console.log(`[CSV Template] Prepared ${csvData.length} rows for CSV export`);

        // If no values exist, provide a sample template
        if (csvData.length === 0) {
            console.log(`[CSV Template] No existing values, adding sample row`);
            csvData.push({
                code: 'SAMPLE01',
                name: 'Sample Value 1',
                description: 'This is a sample dimension value'
            });
        }

        console.log(`[CSV Template] Sample CSV data:`, csvData.slice(0, 3));

        // Convert to CSV - fix the Papa usage
        let csv: string;
        try {
            console.log(`[CSV Template] Converting data to CSV using Papa.unparse...`);
            
            // Create CSV manually if Papa.unparse fails
            const headers = ['code', 'name', 'description'];
            const csvRows = [headers.join(',')];
            
            csvData.forEach(row => {
                const csvRow = [
                    `"${row.code.replace(/"/g, '""')}"`,
                    `"${row.name.replace(/"/g, '""')}"`,
                    `"${(row.description || '').replace(/"/g, '""')}"`
                ].join(',');
                csvRows.push(csvRow);
            });
            
            csv = csvRows.join('\n');
            console.log(`[CSV Template] Successfully created CSV with ${csvRows.length} rows (including header)`);
            console.log(`[CSV Template] CSV preview:`, csv.substring(0, 200));
            
        } catch (error) {
            console.error(`[CSV Template] Error creating CSV:`, error);
            throw new Error(`Failed to generate CSV: ${error.message}`);
        }

        // Set response headers for file download
        const filename = `${dimension.name.toLowerCase().replace(/\s+/g, '_')}_values_template.csv`;
        console.log(`[CSV Template] Setting response headers for download: ${filename}`);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        console.log(`[CSV Template] Sending CSV response (${csv.length} characters)`);
        res.status(200).send(csv);
    })
);

// GET master values template for all dimensions of a client
router.get('/clients/:clientId/master-values-template', isAuthenticated, asyncHandler(async (req, res) => {
    const clientId = parseInt(req.params.clientId, 10);
    if (isNaN(clientId)) {
        return throwBadRequest('A valid client ID is required.');
    }

    console.log(`[Master Template] Starting master template generation for client ${clientId}`);

    try {
        // Fetch all dimensions for the client
        const dimensions = await dimensionStorage.getDimensionsByClient(clientId);
        console.log(`[Master Template] Found ${dimensions.length} dimensions for client ${clientId}`);

        if (!dimensions || dimensions.length === 0) {
            console.log(`[Master Template] No dimensions found for client ${clientId}`);
            return throwBadRequest('No dimensions found for this client.');
        }

        // Prepare CSV data
        const csvData = [];
        const headers = ['dimension_code', 'value_code', 'value_name', 'value_description'];
        csvData.push(headers);

        // Collect all dimension values
        for (const dimension of dimensions) {
            console.log(`[Master Template] Processing dimension: ${dimension.name} (${dimension.code}) with ${dimension.values?.length || 0} values`);
            
            if (dimension.values && dimension.values.length > 0) {
                dimension.values.forEach(value => {
                    const row = [
                        dimension.code,
                        value.code,
                        value.name,
                        value.description || ''
                    ];
                    csvData.push(row);
                });
            }
        }

        console.log(`[Master Template] Generated CSV data with ${csvData.length} rows (including header)`);

        // Generate CSV using Papa.unparse
        let csv;
        try {
            csv = Papa.unparse(csvData);
            console.log(`[Master Template] Successfully created CSV with Papa.unparse`);
            console.log(`[Master Template] CSV preview:`, csv.substring(0, 200));
        } catch (error) {
            console.error(`[Master Template] Error creating CSV with Papa.unparse:`, error);
            throw new Error(`Failed to generate CSV: ${error.message}`);
        }

        // Set response headers for file download
        const filename = `client_${clientId}_master_values_template.csv`;
        console.log(`[Master Template] Setting response headers for download: ${filename}`);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        console.log(`[Master Template] Sending CSV response (${csv.length} characters)`);
        res.status(200).send(csv);

    } catch (error) {
        console.error(`[Master Template] Error generating master template:`, error);
        throw new Error(`Failed to generate master template: ${error.message}`);
    }
}));

// POST master values upload for all dimensions of a client
router.post('/clients/:clientId/master-values-upload', isAuthenticated, upload.single('file'), asyncHandler(async (req, res) => {
    const clientId = parseInt(req.params.clientId, 10);
    if (isNaN(clientId)) {
        return throwBadRequest('A valid client ID is required.');
    }

    if (!req.file) {
        return throwBadRequest('No file uploaded.');
    }

    console.log(`[Master Upload] Starting master upload for client ${clientId}`);
    console.log(`[Master Upload] File info: ${req.file.originalname}, size: ${req.file.size} bytes`);

    try {
        // Step 1: Parse CSV
        const csvText = req.file.buffer.toString('utf-8');
        console.log(`[Master Upload] CSV content preview:`, csvText.substring(0, 200));
        
        let parsedData;
        try {
            parsedData = Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                transformHeader: (header) => header.trim().toLowerCase()
            });
        } catch (parseError) {
            console.error(`[Master Upload] CSV parsing error:`, parseError);
            return throwBadRequest('Invalid CSV format. Please check your file.');
        }

        if (parsedData.errors && parsedData.errors.length > 0) {
            console.error(`[Master Upload] CSV parsing errors:`, parsedData.errors);
            return throwBadRequest(`CSV parsing errors: ${parsedData.errors.map(e => e.message).join(', ')}`);
        }

        const rows = parsedData.data;
        console.log(`[Master Upload] Parsed ${rows.length} rows from CSV`);

        // Validate required headers
        const requiredHeaders = ['dimension_code', 'value_code', 'value_name'];
        const optionalHeaders = ['value_description', 'is_active'];
        const expectedHeaders = [...requiredHeaders, ...optionalHeaders];
        
        if (rows.length === 0) {
            return throwBadRequest('CSV file is empty or contains no data rows.');
        }

        const csvHeaders = Object.keys(rows[0] || {});
        const missingHeaders = requiredHeaders.filter(header => !csvHeaders.includes(header));
        
        if (missingHeaders.length > 0) {
            return throwBadRequest(`Missing required headers: ${missingHeaders.join(', ')}`);
        }

        console.log(`[Master Upload] CSV headers validated: ${csvHeaders.join(', ')}`);

        // Step 2: Pre-fetch existing dimensions and values
        console.log(`[Master Upload] Fetching existing dimensions for client ${clientId}`);
        const existingDimensions = await dimensionStorage.getDimensionsByClient(clientId);
        console.log(`[Master Upload] Found ${existingDimensions.length} existing dimensions`);

        // Create lookup maps for performance
        const dimensionCodeMap = new Map();
        const existingValueMap = new Map(); // key: "dimensionCode|valueCode", value: dimension value object

        existingDimensions.forEach(dimension => {
            dimensionCodeMap.set(dimension.code.toUpperCase(), dimension);
            
            if (dimension.values && dimension.values.length > 0) {
                dimension.values.forEach(value => {
                    const key = `${dimension.code.toUpperCase()}|${value.code.toUpperCase()}`;
                    existingValueMap.set(key, value);
                });
            }
        });

        console.log(`[Master Upload] Created lookup maps: ${dimensionCodeMap.size} dimensions, ${existingValueMap.size} existing values`);

        // Step 3: Validate and process rows
        const validationErrors: string[] = [];
        const processedRows: any[] = [];
        let rowIndex = 0;

        for (const row of rows) {
            const rowData = row as any;
            rowIndex++;
            const errors: string[] = [];
            
            // Validate required fields
            if (!rowData.dimension_code || !rowData.dimension_code.trim()) {
                errors.push('dimension_code is required');
            }
            if (!rowData.value_code || !rowData.value_code.trim()) {
                errors.push('value_code is required');
            }
            if (!rowData.value_name || !rowData.value_name.trim()) {
                errors.push('value_name is required');
            }

            if (errors.length > 0) {
                validationErrors.push(`Row ${rowIndex}: ${errors.join(', ')}`);
                continue;
            }

            // Normalize data
            const dimensionCode = rowData.dimension_code.trim().toUpperCase();
            const valueCode = rowData.value_code.trim().toUpperCase();
            const valueName = rowData.value_name.trim();
            const valueDescription = rowData.value_description ? rowData.value_description.trim() : '';
            
            // Parse is_active with default to true
            let isActive = true;
            if (rowData.is_active !== undefined && rowData.is_active !== null && rowData.is_active !== '') {
                const activeStr = rowData.is_active.toString().toLowerCase().trim();
                isActive = activeStr === 'true' || activeStr === '1' || activeStr === 'yes' || activeStr === 'active';
            }

            // Validate dimension exists
            const dimension = dimensionCodeMap.get(dimensionCode);
            if (!dimension) {
                validationErrors.push(`Row ${rowIndex}: Dimension with code '${dimensionCode}' not found`);
                continue;
            }

            // Check if value already exists
            const existingValueKey = `${dimensionCode}|${valueCode}`;
            const existingValue = existingValueMap.get(existingValueKey);

            processedRows.push({
                rowIndex,
                dimensionId: dimension.id,
                dimensionCode,
                valueCode,
                valueName,
                valueDescription,
                isActive,
                existingValue,
                isUpdate: !!existingValue
            });
        }

        console.log(`[Master Upload] Validation complete: ${processedRows.length} valid rows, ${validationErrors.length} errors`);

        if (validationErrors.length > 0) {
            console.error(`[Master Upload] Validation errors:`, validationErrors);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validationErrors
            });
        }

        // Step 4: Perform bulk upsert
        console.log(`[Master Upload] Starting bulk upsert operation`);
        const result = await dimensionStorage.bulkUpsertDimensionValues(processedRows);
        
        console.log(`[Master Upload] Upload completed successfully:`, result);
        
        res.status(200).json({
            success: true,
            message: 'Master upload completed successfully',
            summary: result
        });

    } catch (error) {
        console.error(`[Master Upload] Error during master upload:`, error);
        throw new Error(`Master upload failed: ${error.message}`);
    }
}));

export default router;