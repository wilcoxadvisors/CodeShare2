// In server/routes/dimensionRoutes.ts

import { Router } from 'express';
import { asyncHandler, throwBadRequest } from '../errorHandling';
import { dimensionStorage } from '../storage/dimensionStorage';
import { isAuthenticated } from '../auth';

const router = Router();

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

export default router;