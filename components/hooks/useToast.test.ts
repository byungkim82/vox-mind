import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToast } from './useToast';
import { TOAST_DEFAULT_DURATION_MS } from '@/lib/constants/ui';

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with empty toasts array', () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.toasts).toEqual([]);
  });

  it('adds toast with correct properties', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.addToast('success', 'Test message');
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]).toMatchObject({
      type: 'success',
      message: 'Test message',
      duration: TOAST_DEFAULT_DURATION_MS,
    });
    expect(result.current.toasts[0].id).toBeDefined();
  });

  it('adds toast with custom duration', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.addToast('info', 'Custom duration', 3000);
    });

    expect(result.current.toasts[0].duration).toBe(3000);
  });

  it('removes toast after duration', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.addToast('info', 'Temporary', 3000);
    });

    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it('does not auto-remove toast when duration is 0', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.addToast('error', 'Persistent', 0);
    });

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(result.current.toasts).toHaveLength(1);
  });

  it('manually removes toast with removeToast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.addToast('success', 'Test', 0);
    });

    const toastId = result.current.toasts[0].id;

    act(() => {
      result.current.removeToast(toastId);
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it('handles multiple toasts', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.addToast('success', 'First');
      result.current.addToast('error', 'Second');
      result.current.addToast('info', 'Third');
    });

    expect(result.current.toasts).toHaveLength(3);
    expect(result.current.toasts[0].message).toBe('First');
    expect(result.current.toasts[1].message).toBe('Second');
    expect(result.current.toasts[2].message).toBe('Third');
  });

  it('removes only specified toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.addToast('success', 'First', 0);
      result.current.addToast('error', 'Second', 0);
    });

    const firstToastId = result.current.toasts[0].id;

    act(() => {
      result.current.removeToast(firstToastId);
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].message).toBe('Second');
  });

  it('handles different toast types', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.addToast('success', 'Success message');
    });
    expect(result.current.toasts[0].type).toBe('success');

    act(() => {
      result.current.addToast('error', 'Error message');
    });
    expect(result.current.toasts[1].type).toBe('error');

    act(() => {
      result.current.addToast('info', 'Info message');
    });
    expect(result.current.toasts[2].type).toBe('info');
  });

  it('each toast has unique id', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.addToast('success', 'First');
      result.current.addToast('success', 'Second');
      result.current.addToast('success', 'Third');
    });

    const ids = result.current.toasts.map((t) => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(3);
  });

  it(`uses default duration of ${TOAST_DEFAULT_DURATION_MS}ms`, () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.addToast('success', 'Default duration');
    });

    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(TOAST_DEFAULT_DURATION_MS - 1);
    });
    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.toasts).toHaveLength(0);
  });
});
