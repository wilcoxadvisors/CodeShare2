/**
 * Asset Storage Tests
 * 
 * Tests for the asset storage module implementation
 */

import { assetStorage, IAssetStorage } from '../../server/storage/assetStorage';
import { db } from '../../server/db';

// Mock the database dependency
jest.mock('../../server/db', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
  }
}));

describe('AssetStorage', () => {
  // Reset mocks between tests
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('getFixedAsset', () => {
    it('should fetch a fixed asset by ID', async () => {
      const mockAsset = { id: 1, name: 'Test Asset', entityId: 1 };
      (db.returning as jest.Mock).mockResolvedValueOnce([mockAsset]);
      
      const result = await assetStorage.getFixedAsset(1);
      
      expect(db.select).toHaveBeenCalled();
      expect(db.from).toHaveBeenCalled();
      expect(db.where).toHaveBeenCalled();
      expect(result).toEqual(mockAsset);
    });
    
    it('should handle errors properly', async () => {
      (db.returning as jest.Mock).mockRejectedValueOnce(new Error('Database error'));
      
      await expect(assetStorage.getFixedAsset(1)).rejects.toThrow();
    });
  });

  describe('getFixedAssets', () => {
    it('should fetch all fixed assets for an entity', async () => {
      const mockAssets = [
        { id: 1, name: 'Asset 1', entityId: 1 },
        { id: 2, name: 'Asset 2', entityId: 1 }
      ];
      (db.returning as jest.Mock).mockResolvedValueOnce(mockAssets);
      
      const result = await assetStorage.getFixedAssets(1);
      
      expect(db.select).toHaveBeenCalled();
      expect(db.from).toHaveBeenCalled();
      expect(db.where).toHaveBeenCalled();
      expect(db.orderBy).toHaveBeenCalled();
      expect(result).toEqual(mockAssets);
    });
  });

  describe('createFixedAsset', () => {
    it('should create a new fixed asset', async () => {
      const mockAsset = { id: 1, name: 'New Asset', entityId: 1 };
      (db.returning as jest.Mock).mockResolvedValueOnce([mockAsset]);
      
      const result = await assetStorage.createFixedAsset({ name: 'New Asset', entityId: 1 } as any);
      
      expect(db.insert).toHaveBeenCalled();
      expect(db.values).toHaveBeenCalled();
      expect(db.returning).toHaveBeenCalled();
      expect(result).toEqual(mockAsset);
    });
  });

  describe('updateFixedAsset', () => {
    it('should update a fixed asset', async () => {
      const mockAsset = { id: 1, name: 'Updated Asset', entityId: 1 };
      (db.returning as jest.Mock).mockResolvedValueOnce([mockAsset]);
      
      const result = await assetStorage.updateFixedAsset(1, { name: 'Updated Asset' } as any);
      
      expect(db.update).toHaveBeenCalled();
      expect(db.set).toHaveBeenCalled();
      expect(db.where).toHaveBeenCalled();
      expect(db.returning).toHaveBeenCalled();
      expect(result).toEqual(mockAsset);
    });
  });

  describe('deleteFixedAsset', () => {
    it('should delete a fixed asset', async () => {
      (db.returning as jest.Mock).mockResolvedValueOnce([]);
      
      await assetStorage.deleteFixedAsset(1);
      
      expect(db.delete).toHaveBeenCalled();
    });
  });
});