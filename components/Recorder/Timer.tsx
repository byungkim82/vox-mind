'use client';

interface TimerProps {
  time: string;
  isRecording: boolean;
}

export function Timer({ time, isRecording }: TimerProps) {
  return (
    <div className="flex items-center gap-2">
      {isRecording && (
        <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
      )}
      <span
        className={`text-2xl font-mono tabular-nums ${
          isRecording ? 'text-gray-900' : 'text-gray-400'
        }`}
      >
        {time}
      </span>
    </div>
  );
}
