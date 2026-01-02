import { Recorder } from '@/components/Recorder';

export default function Home() {
  return (
    <main className="min-h-screen p-8 bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-4 text-center">
          Vox Mind
        </h1>
        <p className="text-lg text-gray-600 mb-8 text-center">
          침묵에 끊기지 않는 녹음과 지능적 인출을 제공하는 AI 기반 음성 지식 베이스
        </p>

        <div className="bg-white rounded-lg shadow-md p-6">
          <Recorder />
        </div>
      </div>
    </main>
  );
}
