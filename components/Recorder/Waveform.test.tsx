import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Waveform } from './Waveform';

describe('Waveform', () => {
  let mockCanvasContext: {
    clearRect: ReturnType<typeof vi.fn>;
    beginPath: ReturnType<typeof vi.fn>;
    moveTo: ReturnType<typeof vi.fn>;
    lineTo: ReturnType<typeof vi.fn>;
    stroke: ReturnType<typeof vi.fn>;
    scale: ReturnType<typeof vi.fn>;
    strokeStyle: string;
    lineWidth: number;
    lineCap: string;
    lineJoin: string;
  };

  beforeEach(() => {
    mockCanvasContext = {
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      scale: vi.fn(),
      strokeStyle: '',
      lineWidth: 0,
      lineCap: '',
      lineJoin: '',
    };

    // Mock canvas getContext
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCanvasContext);

    // Mock devicePixelRatio
    Object.defineProperty(window, 'devicePixelRatio', {
      value: 1,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('renders a container div', () => {
      const { container } = render(
        <Waveform dataArray={null} isRecording={false} />
      );

      expect(container.querySelector('div')).toBeInTheDocument();
    });

    it('renders a canvas element', () => {
      const { container } = render(
        <Waveform dataArray={null} isRecording={false} />
      );

      expect(container.querySelector('canvas')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <Waveform dataArray={null} isRecording={false} className="custom-class" />
      );

      const containerDiv = container.firstChild as HTMLDivElement;
      expect(containerDiv).toHaveClass('custom-class');
    });
  });

  describe('canvas sizing', () => {
    it('canvas has absolute positioning', () => {
      const { container } = render(
        <Waveform dataArray={null} isRecording={false} />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toHaveClass('absolute');
      expect(canvas).toHaveClass('inset-0');
    });

    it('canvas has full width and height', () => {
      const { container } = render(
        <Waveform dataArray={null} isRecording={false} />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toHaveClass('w-full');
      expect(canvas).toHaveClass('h-full');
    });
  });

  describe('drawing when not recording', () => {
    it('clears the canvas', () => {
      render(<Waveform dataArray={null} isRecording={false} />);

      expect(mockCanvasContext.clearRect).toHaveBeenCalled();
    });

    it('draws a flat line when not recording', () => {
      render(<Waveform dataArray={null} isRecording={false} />);

      expect(mockCanvasContext.beginPath).toHaveBeenCalled();
      expect(mockCanvasContext.moveTo).toHaveBeenCalled();
      expect(mockCanvasContext.lineTo).toHaveBeenCalled();
      expect(mockCanvasContext.stroke).toHaveBeenCalled();
    });

    it('uses surface-lighter color for flat line', () => {
      render(<Waveform dataArray={null} isRecording={false} />);

      expect(mockCanvasContext.strokeStyle).toBe('#233f48');
    });
  });

  describe('drawing when recording', () => {
    it('draws waveform when recording with data', () => {
      const dataArray = new Uint8Array([128, 150, 100, 128, 180, 80]);

      render(<Waveform dataArray={dataArray} isRecording={true} />);

      expect(mockCanvasContext.beginPath).toHaveBeenCalled();
      expect(mockCanvasContext.stroke).toHaveBeenCalled();
    });

    it('uses primary color for waveform', () => {
      const dataArray = new Uint8Array([128, 150, 100, 128]);

      render(<Waveform dataArray={dataArray} isRecording={true} />);

      expect(mockCanvasContext.strokeStyle).toBe('#13b6ec');
    });

    it('sets line width to 2', () => {
      const dataArray = new Uint8Array([128, 150, 100, 128]);

      render(<Waveform dataArray={dataArray} isRecording={true} />);

      expect(mockCanvasContext.lineWidth).toBe(2);
    });

    it('sets round line cap', () => {
      const dataArray = new Uint8Array([128, 150, 100, 128]);

      render(<Waveform dataArray={dataArray} isRecording={true} />);

      expect(mockCanvasContext.lineCap).toBe('round');
    });

    it('sets round line join', () => {
      const dataArray = new Uint8Array([128, 150, 100, 128]);

      render(<Waveform dataArray={dataArray} isRecording={true} />);

      expect(mockCanvasContext.lineJoin).toBe('round');
    });

    it('draws flat line when recording but no data', () => {
      render(<Waveform dataArray={null} isRecording={true} />);

      // Should still draw flat line
      expect(mockCanvasContext.strokeStyle).toBe('#233f48');
    });
  });

  describe('data array processing', () => {
    it('moves to first point', () => {
      const dataArray = new Uint8Array([128, 150, 100]);

      render(<Waveform dataArray={dataArray} isRecording={true} />);

      // First point should use moveTo
      expect(mockCanvasContext.moveTo).toHaveBeenCalled();
    });

    it('draws lines for subsequent points', () => {
      const dataArray = new Uint8Array([128, 150, 100, 128, 180]);

      render(<Waveform dataArray={dataArray} isRecording={true} />);

      // Should call lineTo for each subsequent point
      expect(mockCanvasContext.lineTo).toHaveBeenCalled();
    });
  });

  describe('re-rendering', () => {
    it('redraws when dataArray changes', () => {
      const { rerender } = render(
        <Waveform dataArray={new Uint8Array([128])} isRecording={true} />
      );

      const initialClearRectCalls = mockCanvasContext.clearRect.mock.calls.length;

      rerender(<Waveform dataArray={new Uint8Array([150])} isRecording={true} />);

      expect(mockCanvasContext.clearRect.mock.calls.length).toBeGreaterThan(
        initialClearRectCalls
      );
    });

    it('redraws when isRecording changes', () => {
      const dataArray = new Uint8Array([128, 150, 100]);

      const { rerender } = render(
        <Waveform dataArray={dataArray} isRecording={false} />
      );

      const initialStrokeCalls = mockCanvasContext.stroke.mock.calls.length;

      rerender(<Waveform dataArray={dataArray} isRecording={true} />);

      expect(mockCanvasContext.stroke.mock.calls.length).toBeGreaterThan(
        initialStrokeCalls
      );
    });
  });

  describe('container styling', () => {
    it('has relative positioning', () => {
      const { container } = render(
        <Waveform dataArray={null} isRecording={false} />
      );

      const containerDiv = container.firstChild as HTMLDivElement;
      expect(containerDiv).toHaveClass('relative');
    });
  });

  describe('default className', () => {
    it('works without className prop', () => {
      const { container } = render(
        <Waveform dataArray={null} isRecording={false} />
      );

      const containerDiv = container.firstChild as HTMLDivElement;
      expect(containerDiv).toHaveClass('relative');
    });
  });
});
