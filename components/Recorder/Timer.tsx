'use client';

interface TimerProps {
  time: string;
  isRecording: boolean;
}

export function Timer({ time, isRecording }: TimerProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-text-secondary text-sm font-medium tracking-widest uppercase">
        Recording Time
      </p>
      <div className="flex items-center gap-3">
        {isRecording && (
          <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
        )}
        <span
          className={`text-5xl sm:text-7xl font-bold tabular-nums tracking-tight ${
            isRecording ? 'text-white' : 'text-text-secondary'
          }`}
        >
          {time}
        </span>
      </div>
    </div>
  );
}
