# Vox Mind - Claude Context

## 프로젝트 개요
AI 기반 음성 메모 애플리케이션. **침묵에 끊기지 않는 녹음**과 **대화형 검색(RAG)**이 핵심.

## 핵심 차별점
- VAD 없이 사용자가 멈출 때까지 무중단 녹음
- 한영 혼용(Code-switching) STT 지원
- AI 자동 구조화 (제목, 요약, 카테고리, 액션 아이템)
- Cloudflare Zero-Egress로 월 $5 이하 운영

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
- Cloudflare R2 (임시 음성 파일)
- Cloudflare Vectorize (벡터 검색)
- Cloudflare Access (인증)

### AI Services (Cloudflare Workers AI)
- `@cf/openai/whisper-large-v3-turbo` - STT
- `@cf/meta/llama-4-scout-17b-16e-instruct` - 구조화
- `@cf/baai/bge-m3` - Embedding (1024차원)
- Cloudflare Workflows - 오케스트레이션

## 현재 상태
- **Production 배포 완료**
- Phase 0, 1 완료 / Phase 3 인증 완료 / Phase 4 배포 완료
- 녹음 → AI 구조화 → D1/Vectorize 저장 동작 확인

## 배포 URL
- **Frontend**: https://vox-mind.pages.dev
- **API**: https://vox-mind-api.byungkim82.workers.dev
- **인증**: Cloudflare Access (One-Time PIN)

## CI/CD
- GitHub Actions (`.github/workflows/deploy.yml`)
- main 브랜치 push 시 자동 배포
- Lint/TypeCheck → Build → Secrets 동기화 → Workers/Pages 배포

## 다음 작업
**IMPLEMENTATION_CHECKLIST.md의 Phase 2 시작**

1. GET /api/memos 엔드포인트 구현
2. 메모 리스트 UI 구현
3. 메모 상세 페이지 구현
4. 삭제 기능 구현

## 주요 문서 위치
- `PRD.md` - 상세 제품 요구사항 문서
- `IMPLEMENTATION_CHECKLIST.md` - Phase별 구현 체크리스트 (166개 작업)

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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## AI 파이프라인 (Cloudflare Workflows)
```
녹음 → R2 저장
  → POST /api/process (Workflow 트리거)
  → [Workflow Steps]
    1. fetch-audio: R2에서 오디오 로드
    2. transcribe: Workers AI STT (@cf/openai/whisper-large-v3-turbo)
    3. structure: Workers AI LLM (@cf/meta/llama-4-scout-17b-16e-instruct)
    4. embed: Workers AI Embedding (@cf/baai/bge-m3, 1024d)
    5. save-d1: D1에 메모 저장
    6. save-vectorize: Vectorize에 벡터 저장
    7. cleanup: R2 파일 삭제
  → GET /api/process/:instanceId (폴링으로 상태 확인)
```

## RAG 검색 플로우 (미구현)
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
- `GET /api/memos` - 메모 리스트 (페이지네이션, 필터링) [미구현]
- `GET /api/memos/:id` - 메모 상세 [미구현]
- `DELETE /api/memos/:id` - 메모 삭제 [미구현]
- `POST /api/chat` - RAG 검색 [미구현]

## 개발 시 주의사항

### AI 프롬프트 핵심 규칙
- LLM 구조화: "한국어 문맥 속 영어 단어는 번역하지 말고 원문 유지"
- RAG 답변: "제공된 메모만 참고, 정보 없으면 '관련 메모 없음' 반환"

### 보안
- Workers AI 사용으로 외부 API 키 불필요
- R2 원본 파일은 처리 후 즉시 삭제
- user_id 필터링 필수 (데이터 격리)

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
│   └── process-memo.ts        # Cloudflare Workflow (7-step 파이프라인)
└── lib/
    ├── auth-middleware.ts     # Cloudflare Access JWT 검증
    ├── workers-ai-stt.ts      # Workers AI STT
    ├── workers-ai-structure.ts # Workers AI 구조화
    ├── workers-ai-embed.ts    # Workers AI 임베딩
    └── types.ts               # 타입 정의

lib/
└── api/
    └── client.ts              # 프론트엔드 API 클라이언트 (폴링 포함)

components/
├── Recorder/                  # 녹음 UI 컴포넌트
├── Toast/                     # 토스트 알림
└── hooks/                     # 커스텀 훅 (useRecorder, useTimer 등)

.github/workflows/
└── deploy.yml                 # CI/CD 파이프라인
```

## 참고 링크
- [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/)
- [Cloudflare Workflows](https://developers.cloudflare.com/workflows/)
- [Cloudflare Vectorize](https://developers.cloudflare.com/vectorize/)
