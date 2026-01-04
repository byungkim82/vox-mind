import { describe, it, expect } from 'vitest';
import {
  CATEGORY_STYLES,
  getCategoryStyles,
  getCategoryBadgeStyle,
  CATEGORIES,
  CATEGORY_FILTER_OPTIONS,
  CATEGORY_LABELS,
} from './categories';
import type { MemoCategory } from '../types';

describe('CATEGORY_STYLES', () => {
  const allCategories: MemoCategory[] = ['업무', '개발', '일기', '아이디어', '학습', '기타'];

  it('defines styles for all 6 categories', () => {
    expect(Object.keys(CATEGORY_STYLES)).toHaveLength(6);

    for (const category of allCategories) {
      expect(CATEGORY_STYLES[category]).toBeDefined();
    }
  });

  it('each category has all required style properties', () => {
    for (const category of allCategories) {
      const styles = CATEGORY_STYLES[category];
      expect(styles).toHaveProperty('gradient');
      expect(styles).toHaveProperty('badge');
      expect(styles).toHaveProperty('dot');
      expect(styles).toHaveProperty('hover');
    }
  });

  it('gradient classes contain bg-gradient-to-r', () => {
    for (const category of allCategories) {
      expect(CATEGORY_STYLES[category].gradient).toContain('bg-gradient-to-r');
    }
  });

  it('badge classes contain text color', () => {
    for (const category of allCategories) {
      expect(CATEGORY_STYLES[category].badge).toMatch(/text-\w+/);
    }
  });

  it('dot classes contain bg color', () => {
    for (const category of allCategories) {
      expect(CATEGORY_STYLES[category].dot).toMatch(/bg-\w+/);
    }
  });

  it('hover classes contain hover:', () => {
    for (const category of allCategories) {
      expect(CATEGORY_STYLES[category].hover).toContain('hover:');
    }
  });
});

describe('getCategoryStyles', () => {
  it('returns correct styles for valid category', () => {
    const styles = getCategoryStyles('업무');
    expect(styles).toEqual(CATEGORY_STYLES['업무']);
    expect(styles.badge).toContain('blue');
  });

  it('returns "기타" styles for null', () => {
    const styles = getCategoryStyles(null);
    expect(styles).toEqual(CATEGORY_STYLES['기타']);
  });

  it('returns "기타" styles for undefined', () => {
    const styles = getCategoryStyles(undefined);
    expect(styles).toEqual(CATEGORY_STYLES['기타']);
  });

  it('returns consistent styles for each category', () => {
    expect(getCategoryStyles('개발').badge).toContain('purple');
    expect(getCategoryStyles('일기').badge).toContain('green');
    expect(getCategoryStyles('아이디어').badge).toContain('yellow');
    expect(getCategoryStyles('학습').badge).toContain('emerald');
    expect(getCategoryStyles('기타').badge).toContain('gray');
  });
});

describe('getCategoryBadgeStyle', () => {
  it('returns badge style string for valid category', () => {
    const badge = getCategoryBadgeStyle('업무');
    expect(badge).toBe(CATEGORY_STYLES['업무'].badge);
    expect(badge).toContain('text-blue-400');
  });

  it('returns "기타" badge style for null', () => {
    const badge = getCategoryBadgeStyle(null);
    expect(badge).toBe(CATEGORY_STYLES['기타'].badge);
  });

  it('returns "기타" badge style for undefined', () => {
    const badge = getCategoryBadgeStyle(undefined);
    expect(badge).toBe(CATEGORY_STYLES['기타'].badge);
  });
});

describe('CATEGORIES', () => {
  it('contains all 6 categories', () => {
    expect(CATEGORIES).toHaveLength(6);
  });

  it('contains "기타" as last category', () => {
    expect(CATEGORIES[CATEGORIES.length - 1]).toBe('기타');
  });

  it('does not contain "all"', () => {
    expect(CATEGORIES).not.toContain('all');
  });
});

describe('CATEGORY_FILTER_OPTIONS', () => {
  it('contains 7 options (all + 6 categories)', () => {
    expect(CATEGORY_FILTER_OPTIONS).toHaveLength(7);
  });

  it('has "all" as first option', () => {
    expect(CATEGORY_FILTER_OPTIONS[0]).toBe('all');
  });

  it('contains all categories', () => {
    for (const category of CATEGORIES) {
      expect(CATEGORY_FILTER_OPTIONS).toContain(category);
    }
  });
});

describe('CATEGORY_LABELS', () => {
  it('has label for "all"', () => {
    expect(CATEGORY_LABELS['all']).toBe('전체');
  });

  it('has labels for all categories', () => {
    for (const category of CATEGORIES) {
      expect(CATEGORY_LABELS[category]).toBeDefined();
      expect(typeof CATEGORY_LABELS[category]).toBe('string');
    }
  });

  it('category labels match category names', () => {
    for (const category of CATEGORIES) {
      expect(CATEGORY_LABELS[category]).toBe(category);
    }
  });
});
