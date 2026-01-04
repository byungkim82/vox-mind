import { describe, it, expect } from 'vitest';
import type { MemoCategory as WorkersMemoCategory } from './types';
import { MEMO_CATEGORIES as WorkersCategories } from './types';
import type { MemoCategory as SharedMemoCategory } from '../../shared/types';
import { MEMO_CATEGORIES as SharedCategories } from '../../shared/types';

/**
 * Type consistency tests for workers types.
 * Verifies that workers types are correctly re-exported from shared types.
 */
describe('Workers Type Consistency', () => {
  describe('MemoCategory', () => {
    // Compile-time type compatibility check
    const testSharedToWorkers: WorkersMemoCategory = '업무' as SharedMemoCategory;
    const testWorkersToShared: SharedMemoCategory = '업무' as WorkersMemoCategory;

    it('should have 6 valid categories from shared source', () => {
      expect(SharedCategories).toHaveLength(6);
    });

    it('should have identical categories in workers re-export', () => {
      expect(WorkersCategories).toEqual(SharedCategories);
    });

    it('should be assignable between shared and workers types', () => {
      const sharedCategory: SharedMemoCategory = '개발';
      const workersCategory: WorkersMemoCategory = sharedCategory;

      expect(sharedCategory).toBe(workersCategory);
    });

    // Suppress unused variable warnings
    void testSharedToWorkers;
    void testWorkersToShared;
  });
});
