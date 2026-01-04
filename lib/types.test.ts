import { describe, it, expect } from 'vitest';
import type { MemoCategory as FrontendMemoCategory } from './types';
import { MEMO_CATEGORIES as FrontendCategories } from './types';
import type { MemoCategory as SharedMemoCategory } from '../shared/types';
import { MEMO_CATEGORIES as SharedCategories } from '../shared/types';

/**
 * Type consistency tests to ensure types are synchronized between
 * frontend (lib/types.ts) and shared (shared/types.ts).
 *
 * Note: Workers types are tested separately via vitest.workers.config.ts
 * because they include Cloudflare-specific types not available in jsdom environment.
 */
describe('Type Consistency', () => {
  describe('MemoCategory', () => {
    // Compile-time type compatibility check
    const testSharedToFrontend: FrontendMemoCategory = '업무' as SharedMemoCategory;
    const testFrontendToShared: SharedMemoCategory = '업무' as FrontendMemoCategory;

    it('should have 6 valid categories from shared source', () => {
      expect(SharedCategories).toHaveLength(6);
    });

    it('should include all expected Korean category names', () => {
      expect(SharedCategories).toContain('업무');
      expect(SharedCategories).toContain('개발');
      expect(SharedCategories).toContain('일기');
      expect(SharedCategories).toContain('아이디어');
      expect(SharedCategories).toContain('학습');
      expect(SharedCategories).toContain('기타');
    });

    it('should have identical categories in frontend re-export', () => {
      expect(FrontendCategories).toEqual(SharedCategories);
    });

    it('should be assignable between shared and frontend types', () => {
      const sharedCategory: SharedMemoCategory = '개발';
      const frontendCategory: FrontendMemoCategory = sharedCategory;

      expect(sharedCategory).toBe(frontendCategory);
    });

    // Suppress unused variable warnings
    void testSharedToFrontend;
    void testFrontendToShared;
  });
});
