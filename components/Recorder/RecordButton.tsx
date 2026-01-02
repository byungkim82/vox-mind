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
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-20 h-20 rounded-full flex items-center justify-center
        transition-all duration-300 ease-in-out
        focus:outline-none focus:ring-4 focus:ring-red-200
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${isRecording ? 'bg-red-600 hover:bg-red-700 scale-110' : 'bg-red-500 hover:bg-red-600'}
      `}
      aria-label={isRecording ? '녹음 중지' : '녹음 시작'}
    >
      {isProcessing ? (
        <Spinner className="w-8 h-8 text-white" />
      ) : isRecording ? (
        // Stop icon (square)
        <div className="w-7 h-7 bg-white rounded-sm" />
      ) : (
        // Record icon (circle)
        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
          <div className="w-6 h-6 rounded-full bg-red-500" />
        </div>
      )}
    </button>
  );
}
