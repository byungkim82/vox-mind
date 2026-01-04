# Vox Mind - Claude Context

## 프로젝트 개요
AI 기반 음성 메모 애플리케이션. **침묵에 끊기지 않는 녹음**과 **대화형 검색(RAG)**이 핵심.

## 핵심 차별점
- VAD 없이 사용자가 멈출 때까지 무중단 녹음
- 한영 혼용(Code-switching) STT 지원 (Groq Whisper)
- AI 자동 구조화 (제목, 요약, 카테고리, 액션 아이템)
- 오디오 재생 기능 (메모 상세에서 원본 녹음 청취 가능)
- Cloudflare 인프라로 저비용 운영 (Groq STT: $0.04/시간)

## 기술 스택

### Frontend
- Next.js 15 (App Router)
- Tailwind CSS
- MediaRecorder API (녹음)

### Backend
- Hono.js (Cloudflare Workers)

### Infrastructure (Cloudflare Native)
- Cloudflare Pages (Frontend)
- Cloudflare Workers (Backend)
- Cloudflare D1 (SQLite)
- Cloudflare R2 (음성 파일 영구 저장 + 재생)
- Cloudflare Vectorize (벡터 검색)
- Cloudflare Access (인증)

### AI Services
- **Groq** `whisper-large-v3-turbo` - STT (100MB 지원, ~299x 빠름)
- **Workers AI** `@cf/meta/llama-4-scout-17b-16e-instruct` - 구조화
- **Workers AI** `@cf/baai/bge-m3` - Embedding (1024차원)
- Cloudflare Workflows - 오케스트레이션

## 현재 상태
- **Production 배포 완료** - 모든 핵심 기능 구현 완료
- Groq Whisper STT 마이그레이션 완료 (100MB 파일 지원)
- R2 오디오 영구 저장 + 메모 상세 오디오 재생 기능
- 다크 테마 디자인 적용
- 메모 상세: 페이지 → 모달 방식으로 변경
- 녹음 → Workflow 처리 → D1/Vectorize 저장 동작 확인

## 배포 URL
- **Frontend**: https://vox-mind.pages.dev
- **API**: https://vox-mind-api.byungkim82.workers.dev
- **인증**: Cloudflare Access (One-Time PIN)

## CI/CD
- GitHub Actions (`.github/workflows/deploy.yml`)
- main 브랜치 push 시 자동 배포
- Lint/TypeCheck → Build → Secrets 동기화 → Workers/Pages 배포

## 향후 개선 사항
- 메모 수정 기능
- 카테고리 필터링 UI
- 메모 검색 (텍스트 기반)
- 액션 아이템 체크리스트 UI
- PWA 지원 (오프라인 녹음)

## 주요 문서 위치
- `PRD.md` - 상세 제품 요구사항 문서

## 데이터베이스 스키마 (D1)
```sql
CREATE TABLE memos (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  raw_text TEXT NOT NULL,        -- STT 전사 텍스트
  title TEXT,                     -- AI 생성 제목
  summary TEXT,                   -- AI 생성 요약
  category TEXT,                  -- 업무|개발|일기|아이디어|학습|기타
  action_items TEXT,              -- JSON 배열
  audio_file_name TEXT,           -- R2 오디오 파일명 (재생용)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## AI 파이프라인 (Cloudflare Workflows)
```
녹음 → R2 저장
  → POST /api/process (Workflow 트리거)
  → [Workflow Steps]
    1. transcribe-groq: R2 presigned URL → Groq Whisper STT
    2. structure: Workers AI LLM (@cf/meta/llama-4-scout-17b-16e-instruct)
    3. embed: Workers AI Embedding (@cf/baai/bge-m3, 1024d)
    4. save-d1: D1에 메모 저장 (audio_file_name 포함)
    5. save-vectorize: Vectorize에 벡터 저장
    (R2 오디오 파일은 재생을 위해 유지)
  → GET /api/process/:instanceId (폴링으로 상태 확인)
```

## RAG 검색 플로우
```
질문 → Workers AI 임베딩 (@cf/baai/bge-m3)
  → Vectorize 유사도 검색 (top-5)
  → D1에서 메모 상세 조회
  → Workers AI LLM 답변 생성
  → { answer, sources }
```

## 주요 API 엔드포인트
- `POST /api/upload` - 음성 파일 R2 업로드
- `POST /api/process` - Workflow 트리거 (비동기, instanceId 반환)
- `GET /api/process/:instanceId` - Workflow 상태 조회
- `GET /api/memos` - 메모 리스트 (페이지네이션, 필터링)
- `GET /api/memos/:id` - 메모 상세
- `GET /api/memos/:id/audio` - 오디오 재생용 presigned URL
- `DELETE /api/memos/:id` - 메모 삭제 (D1 + Vectorize + R2)
- `POST /api/chat` - RAG 검색 (대화형 AI 답변)

## 개발 시 주의사항

### AI 프롬프트 핵심 규칙
- LLM 구조화: "한국어 문맥 속 영어 단어는 번역하지 말고 원문 유지"
- RAG 답변: "제공된 메모만 참고, 정보 없으면 '관련 메모 없음' 반환"

### 보안
- Groq API 키 필요 (STT용)
- R2 파일은 영구 저장 (presigned URL로 접근, 1시간 유효)
- user_id 필터링 필수 (데이터 격리)
- 메모 삭제 시 R2 파일도 함께 삭제

### 성능 목표
- STT 처리 < 녹음 길이의 20%
- AI 구조화 < 10초
- RAG 검색 < 3초

## 브랜치 전략
- `main` - 프로덕션 (자동 배포)
- GitHub Actions가 main push 시 자동으로 Workers/Pages 배포

## 주요 파일 구조
```
workers/
├── api.ts                     # Hono API 서버 + Workflow export
├── workflows/
│   └── process-memo.ts        # Cloudflare Workflow (5-step 파이프라인)
└── lib/
    ├── auth-middleware.ts     # Cloudflare Access JWT 검증
    ├── groq-stt.ts            # Groq Whisper STT
    ├── r2-presigned.ts        # R2 presigned URL 생성
    ├── workers-ai-structure.ts # Workers AI 구조화
    ├── workers-ai-embed.ts    # Workers AI 임베딩
    └── types.ts               # 타입 정의

app/
├── page.tsx                   # 홈 (녹음 페이지)
├── memos/
│   └── page.tsx               # 메모 리스트 페이지 (모달로 상세 표시)
└── search/
    └── page.tsx               # RAG 검색 페이지

lib/
├── api/
│   └── client.ts              # 프론트엔드 API 클라이언트
└── types.ts                   # 공통 타입 정의

components/
├── Recorder/                  # 녹음 UI 컴포넌트
├── MemoList/                  # 메모 리스트 컴포넌트
├── MemoCard/                  # 메모 카드 컴포넌트
├── MemoDetailModal/           # 메모 상세 모달 (오디오 재생 포함)
├── ChatInterface/             # RAG 채팅 UI 컴포넌트
├── Navbar/                    # 네비게이션 바
└── Toast/                     # 토스트 알림

.github/workflows/
└── deploy.yml                 # CI/CD 파이프라인
```

## 참고 링크
- [Groq API](https://console.groq.com/docs/speech-to-text)
- [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/)
- [Cloudflare Workflows](https://developers.cloudflare.com/workflows/)
- [Cloudflare Vectorize](https://developers.cloudflare.com/vectorize/)
