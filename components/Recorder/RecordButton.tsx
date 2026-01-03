'use client';

interface RecordButtonProps {
  isRecording: boolean;
  isProcessing: boolean;
  onClick: () => void;
  disabled?: boolean;
}

function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export function RecordButton({
  isRecording,
  isProcessing,
  onClick,
  disabled = false,
}: RecordButtonProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative group">
        {/* Glow effect */}
        <div className={`absolute -inset-1 rounded-full blur transition-opacity duration-500 ${
          isRecording ? 'bg-primary/30 opacity-60' : 'bg-primary/20 opacity-0 group-hover:opacity-40'
        }`} />

        <button
          onClick={onClick}
          disabled={disabled}
          className={`
            relative w-20 h-20 rounded-full flex items-center justify-center
            transition-all duration-300 ease-in-out
            focus:outline-none focus:ring-4 focus:ring-primary/30
            shadow-xl
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
            ${isRecording
              ? 'bg-white shadow-primary/20'
              : 'bg-white shadow-primary/10'}
          `}
          aria-label={isRecording ? '녹음 중지' : '녹음 시작'}
        >
          {isProcessing ? (
            <Spinner className="w-8 h-8 text-primary" />
          ) : isRecording ? (
            // Stop icon (square)
            <svg className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            // Mic icon
            <svg className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15a.998.998 0 00-.98-.85c-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/>
            </svg>
          )}
        </button>
      </div>

      <span className="text-sm text-white font-bold tracking-wide">
        {isRecording ? '녹음 종료' : '녹음 시작'}
      </span>
    </div>
  );
}
