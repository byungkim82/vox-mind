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

### AI Services
- Groq (Whisper-large-v3-turbo) - STT
- Gemini 2.0 Flash - 구조화 & RAG
- Voyage 3.5-lite - Embedding (512차원)

## 현재 상태
- 프로젝트 초기 단계 (코드 없음)
- PRD 및 구현 체크리스트 작성 완료
- Phase 0 (환경 설정)부터 시작 필요

## 다음 작업
**IMPLEMENTATION_CHECKLIST.md의 Phase 0부터 시작**

1. Node.js, Wrangler 설치
2. API 키 발급 (Groq, Gemini, Voyage)
3. Cloudflare 리소스 생성 (D1, R2, Vectorize)
4. Next.js 프로젝트 초기화

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

## AI 파이프라인
```
녹음 → R2 저장
  → Groq STT (한영 혼용 전사)
  → Gemini 구조화 (title, summary, category, action_items)
  → Voyage 임베딩 (summary → 512차원 벡터)
  → D1 저장 + Vectorize 저장
  → R2 삭제
```

## RAG 검색 플로우
```
질문 → Voyage 임베딩
  → Vectorize 유사도 검색 (top-5)
  → D1에서 메모 상세 조회
  → Gemini 답변 생성
  → { answer, sources }
```

## 주요 API 엔드포인트
- `POST /api/upload` - 음성 파일 R2 업로드
- `POST /api/process` - AI 파이프라인 실행
- `GET /api/memos` - 메모 리스트 (페이지네이션, 필터링)
- `GET /api/memos/:id` - 메모 상세
- `DELETE /api/memos/:id` - 메모 삭제
- `POST /api/chat` - RAG 검색

## 개발 시 주의사항

### AI 프롬프트 핵심 규칙
- Gemini 구조화: "한국어 문맥 속 영어 단어는 번역하지 말고 원문 유지"
- RAG 답변: "제공된 메모만 참고, 정보 없으면 '관련 메모 없음' 반환"

### 보안
- 모든 API 키는 환경 변수 관리
- R2 원본 파일은 처리 후 즉시 삭제
- user_id 필터링 필수 (데이터 격리)

### 성능 목표
- STT 처리 < 녹음 길이의 20%
- AI 구조화 < 10초
- RAG 검색 < 3초

## 브랜치 전략
- `main` - 프로덕션
- `phase-1-recording` - Phase 1 작업
- `phase-2-ui` - Phase 2 작업
- `phase-3-rag` - Phase 3 작업

## 참고 링크
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Groq API](https://console.groq.com/docs)
- [Gemini API](https://ai.google.dev/docs)
- [Voyage AI](https://docs.voyageai.com/)
