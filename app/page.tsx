export default function Home() {
  return (
    <main className="min-h-screen p-8 bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Vox Mind
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          침묵에 끊기지 않는 녹음과 지능적 인출을 제공하는 AI 기반 음성 지식 베이스
        </p>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            개발 진행 중
          </h2>
          <p className="text-gray-600">
            Phase 0.4 - 프로젝트 초기화 완료<br />
            Phase 1 - 백엔드 AI 파이프라인 구현 예정
          </p>
        </div>
      </div>
    </main>
  );
}
