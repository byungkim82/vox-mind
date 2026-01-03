import { Recorder } from '@/components/Recorder';

export default function Home() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8 md:hidden">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Vox Mind
        </h1>
        <p className="text-sm text-gray-600">
          AI 기반 음성 메모
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <Recorder />
      </div>
    </div>
  );
}
