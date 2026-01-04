import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { formatRelativeDate, formatFullDateTime, formatShortDate } from './date-format';

describe('formatRelativeDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "오늘" for today', () => {
    expect(formatRelativeDate('2024-01-15T10:00:00')).toBe('오늘');
    expect(formatRelativeDate('2024-01-15T00:00:00')).toBe('오늘');
    expect(formatRelativeDate('2024-01-15T23:59:59')).toBe('오늘');
  });

  it('returns "어제" for yesterday', () => {
    expect(formatRelativeDate('2024-01-14T10:00:00')).toBe('어제');
    expect(formatRelativeDate('2024-01-14T23:59:59')).toBe('어제');
  });

  it('returns "N일 전" for 2-6 days ago', () => {
    expect(formatRelativeDate('2024-01-13T10:00:00')).toBe('2일 전');
    expect(formatRelativeDate('2024-01-12T10:00:00')).toBe('3일 전');
    expect(formatRelativeDate('2024-01-10T10:00:00')).toBe('5일 전');
    expect(formatRelativeDate('2024-01-09T10:00:00')).toBe('6일 전');
  });

  it('returns formatted date for 7+ days ago', () => {
    const result = formatRelativeDate('2024-01-08T10:00:00');
    expect(result).toMatch(/2024/);
    expect(result).toMatch(/1월/);
    expect(result).toMatch(/8일/);
  });

  it('returns formatted date for dates in previous year', () => {
    const result = formatRelativeDate('2023-12-01T10:00:00');
    expect(result).toMatch(/2023/);
    expect(result).toMatch(/12월/);
  });

  it('returns "오늘" for future dates (same day)', () => {
    expect(formatRelativeDate('2024-01-15T23:59:59')).toBe('오늘');
  });

  it('handles ISO date strings without timezone', () => {
    // Local time without timezone specifier
    expect(formatRelativeDate('2024-01-15T00:00:00')).toBe('오늘');
    expect(formatRelativeDate('2024-01-14T00:00:00')).toBe('어제');
  });
});

describe('formatFullDateTime', () => {
  it('formats date with year, month, day, hour, and minute', () => {
    const result = formatFullDateTime('2024-01-15T14:30:00');
    expect(result).toMatch(/2024년/);
    expect(result).toMatch(/1월/);
    expect(result).toMatch(/15일/);
    // Time format may vary (24h or 12h depending on locale)
    expect(result).toMatch(/\d{1,2}:\d{2}|오후|오전/);
  });

  it('formats morning time correctly', () => {
    const result = formatFullDateTime('2024-01-15T09:05:00');
    expect(result).toMatch(/2024년/);
    expect(result).toMatch(/9|09/);
    expect(result).toMatch(/05/);
  });

  it('formats midnight correctly', () => {
    const result = formatFullDateTime('2024-01-15T00:00:00');
    expect(result).toMatch(/2024년/);
    expect(result).toMatch(/15일/);
  });
});

describe('formatShortDate', () => {
  it('formats date with month and day only', () => {
    const result = formatShortDate('2024-01-15T14:30:00');
    expect(result).toMatch(/1월/);
    expect(result).toMatch(/15일/);
    // Should not include year
    expect(result).not.toMatch(/2024/);
  });

  it('formats December date correctly', () => {
    const result = formatShortDate('2024-12-25T10:00:00');
    expect(result).toMatch(/12월/);
    expect(result).toMatch(/25일/);
  });

  it('formats single digit day correctly', () => {
    const result = formatShortDate('2024-01-05T10:00:00');
    expect(result).toMatch(/1월/);
    expect(result).toMatch(/5일/);
  });
});
