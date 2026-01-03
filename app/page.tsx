import { Recorder } from '@/components/Recorder';

export default function Home() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8 md:hidden">
        <h1 className="text-2xl font-bold text-white mb-2">
          Vox Mind
        </h1>
        <p className="text-sm text-text-secondary">
          AI 기반 음성 메모
        </p>
      </div>

      <div className="rounded-2xl p-6">
        <Recorder />
      </div>
    </div>
  );
}
