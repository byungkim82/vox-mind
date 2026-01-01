# Vox Mind - Implementation Checklist

**Last Updated**: 2026-01-01
**Current Phase**: Phase 0 (Setup)
**Overall Progress**: 0%

---

## 📋 How to Use This Checklist

1. **체크 표시**: 완료된 항목은 `[ ]`를 `[x]`로 변경
2. **우선순위**: 🔴 High | 🟡 Medium | 🟢 Low
3. **의존성**: `→ depends on` 표시된 항목은 선행 작업 완료 필요
4. **브랜치 전략**: 각 Phase별로 별도 브랜치 생성 권장 (`phase-1-recording`, `phase-2-ui`, `phase-3-rag`)

---

## Phase 0: 프로젝트 초기 설정

### 0.1 환경 설정
- [ ] 🔴 Node.js 18+ 설치 확인
- [ ] 🔴 Cloudflare 계정 생성 및 로그인
- [ ] 🔴 Wrangler CLI 설치 (`npm install -g wrangler`)
- [ ] 🔴 Wrangler 로그인 (`wrangler login`)
- [ ] 🟡 Git 저장소 초기화 및 GitHub 연동

### 0.2 외부 서비스 API 키 발급
- [ ] 🔴 Groq API Key 발급 (https://console.groq.com)
- [ ] 🔴 Google AI Studio에서 Gemini API Key 발급 (https://ai.google.dev)
- [ ] 🔴 Voyage AI API Key 발급 (https://www.voyageai.com)
- [ ] 🟡 API 키를 안전한 곳에 저장 (비밀번호 관리자 등)

### 0.3 Cloudflare 리소스 생성
- [ ] 🔴 Cloudflare D1 데이터베이스 생성
  ```bash
  wrangler d1 create vox-mind-db
  ```
- [ ] 🔴 Cloudflare R2 버킷 생성
  ```bash
  wrangler r2 bucket create vox-mind-audio-temp
  ```
- [ ] 🔴 Cloudflare Vectorize 인덱스 생성
  ```bash
  wrangler vectorize create vox-mind-embeddings --dimensions=512 --metric=cosine
  ```
- [ ] 🟡 생성된 리소스 ID 기록

### 0.4 프로젝트 구조 설정
- [ ] 🔴 Next.js 프로젝트 생성
  ```bash
  npx create-next-app@latest vox-mind --typescript --tailwind --app
  ```
- [ ] 🔴 프로젝트 디렉토리 구조 생성
  ```
  vox-mind/
  ├── app/                 # Next.js App Router
  ├── components/          # React 컴포넌트
  ├── lib/                 # 유틸리티 함수
  ├── workers/             # Cloudflare Workers (Hono.js)
  ├── migrations/          # D1 마이그레이션
  └── public/              # 정적 파일
  ```
- [ ] 🔴 `wrangler.toml` 파일 생성 및 바인딩 설정
- [ ] 🔴 환경 변수 파일 생성 (`.env.local`, `.dev.vars`)
- [ ] 🟡 `.gitignore` 업데이트 (API 키, 환경 변수 제외)

**Deliverables**:
- ✅ 로컬 개발 환경 완전 설정
- ✅ 모든 외부 API 키 발급 완료
- ✅ Cloudflare 리소스 생성 완료
- ✅ `wrangler.toml` 설정 완료

**Progress**: 0 / 14 tasks

---

## Phase 1: 핵심 녹음 및 AI 파이프라인

**목표**: 녹음 → STT → AI 구조화 → 저장 플로우 구현
**Estimated Duration**: 4-6 iterations
**Branch**: `phase-1-recording`

### 1.1 D1 데이터베이스 스키마 설정
- [ ] 🔴 D1 마이그레이션 파일 생성 (`migrations/0001_create_memos_table.sql`)
  ```sql
  CREATE TABLE memos (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    raw_text TEXT NOT NULL,
    title TEXT,
    summary TEXT,
    category TEXT,
    action_items TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX idx_user_created ON memos(user_id, created_at DESC);
  CREATE INDEX idx_category ON memos(category);
  CREATE INDEX idx_user_category ON memos(user_id, category);
  ```
- [ ] 🔴 마이그레이션 실행
  ```bash
  wrangler d1 migrations apply vox-mind-db --local
  wrangler d1 migrations apply vox-mind-db --remote
  ```
- [ ] 🟡 마이그레이션 성공 확인 (`wrangler d1 execute vox-mind-db --command "SELECT * FROM memos"`)

### 1.2 Hono.js Workers 백엔드 초기 설정
- [ ] 🔴 Hono.js 설치
  ```bash
  npm install hono
  ```
- [ ] 🔴 `workers/api.ts` 파일 생성 (Hono 앱 초기화)
- [ ] 🔴 기본 라우트 설정 (GET `/`, GET `/health`)
- [ ] 🔴 CORS 미들웨어 설정 (Next.js 프론트엔드와 통신용)
- [ ] 🟡 `wrangler.toml`에 Workers 설정 추가
- [ ] 🟡 로컬에서 Workers 실행 테스트
  ```bash
  wrangler dev workers/api.ts
  ```

### 1.3 POST /api/upload 엔드포인트 구현
- [ ] 🔴 Hono.js에 POST `/api/upload` 라우트 추가
- [ ] 🔴 Multipart form-data 파싱 (Hono의 `req.parseBody()` 사용)
- [ ] 🔴 UUID 생성 (`crypto.randomUUID()`)
- [ ] 🔴 R2에 파일 업로드 로직 구현
  ```typescript
  const fileId = crypto.randomUUID();
  await env.AUDIO_BUCKET.put(`${fileId}.webm`, audioBlob);
  ```
- [ ] 🔴 업로드 성공 시 `{ fileId, uploadedAt }` 응답
- [ ] 🟡 에러 핸들링 (파일 크기 제한, 형식 검증)
- [ ] 🟡 Postman/cURL로 업로드 테스트

### 1.4 외부 AI API 클라이언트 구현
- [ ] 🔴 `lib/groq-client.ts` 생성 (Groq STT 함수)
  ```typescript
  async function transcribeAudio(audioBuffer: ArrayBuffer): Promise<string>
  ```
- [ ] 🔴 `lib/gemini-client.ts` 생성 (Gemini 구조화 함수)
  ```typescript
  async function structureMemo(rawText: string): Promise<MemoStructure>
  ```
- [ ] 🔴 `lib/voyage-client.ts` 생성 (Voyage 임베딩 함수)
  ```typescript
  async function generateEmbedding(text: string): Promise<number[]>
  ```
- [ ] 🟡 각 클라이언트 함수 단위 테스트 (샘플 데이터로)
- [ ] 🟡 에러 핸들링 및 재시도 로직 추가

### 1.5 POST /api/process 엔드포인트 구현
- [ ] 🔴 POST `/api/process` 라우트 추가
- [ ] 🔴 R2에서 파일 읽기
  ```typescript
  const file = await env.AUDIO_BUCKET.get(`${fileId}.webm`);
  ```
- [ ] 🔴 Groq STT 호출 → `rawText` 추출 (→ depends on 1.4)
- [ ] 🔴 Gemini 구조화 호출 → `{ title, summary, category, action_items }` (→ depends on 1.4)
- [ ] 🔴 Voyage 임베딩 호출 → `embedding` (→ depends on 1.4)
- [ ] 🔴 D1에 메모 저장
  ```typescript
  await env.DB.prepare(`
    INSERT INTO memos (id, user_id, raw_text, title, summary, category, action_items)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(memoId, 'temp-user', rawText, title, summary, category, JSON.stringify(action_items)).run();
  ```
- [ ] 🔴 Vectorize에 벡터 저장
  ```typescript
  await env.VECTORIZE.insert([{
    id: memoId,
    values: embedding,
    metadata: { memo_id: memoId, user_id: 'temp-user' }
  }]);
  ```
- [ ] 🔴 R2에서 원본 파일 삭제
  ```typescript
  await env.AUDIO_BUCKET.delete(`${fileId}.webm`);
  ```
- [ ] 🟡 트랜잭션 처리 (D1 저장 실패 시 Vectorize 롤백 고려)
- [ ] 🟡 에러 핸들링 (각 단계별 실패 시 적절한 HTTP 상태 코드)
- [ ] 🟡 E2E 테스트 (파일 업로드 → 프로세싱 → D1 조회)

### 1.6 Next.js 녹음 UI 구현
- [ ] 🔴 `components/Recorder.tsx` 컴포넌트 생성
- [ ] 🔴 MediaRecorder API 권한 요청 (`navigator.mediaDevices.getUserMedia`)
- [ ] 🔴 녹음 시작/중지 버튼 UI (Tailwind CSS)
- [ ] 🔴 녹음 상태 관리 (useState: 'idle' | 'recording' | 'processing')
- [ ] 🔴 경과 시간 표시 (MM:SS 형식, setInterval 사용)
- [ ] 🔴 Waveform 애니메이션 구현 (Canvas API 또는 `wavesurfer.js` 라이브러리)
- [ ] 🔴 녹음 중지 시 Blob 생성 및 POST `/api/upload` 호출
- [ ] 🔴 업로드 성공 후 POST `/api/process` 호출
- [ ] 🟡 프로세싱 진행 상태 표시 (로딩 스피너)
- [ ] 🟡 성공/실패 토스트 메시지
- [ ] 🟡 브라우저 호환성 테스트 (Chrome, Safari, Edge)

### 1.7 메인 페이지 통합
- [ ] 🔴 `app/page.tsx`에 Recorder 컴포넌트 배치
- [ ] 🔴 기본 레이아웃 구성 (헤더, 녹음 영역)
- [ ] 🟡 반응형 디자인 적용 (모바일 대응)
- [ ] 🟡 다크 모드 지원 (옵션)

### 1.8 Phase 1 테스트 및 디버깅
- [ ] 🔴 전체 플로우 E2E 테스트 (녹음 → 저장 → D1 확인)
- [ ] 🔴 한영 혼용 텍스트 STT 정확도 테스트 (5개 샘플)
- [ ] 🟡 에러 케이스 테스트 (API 실패, 네트워크 오류 등)
- [ ] 🟡 성능 테스트 (5분 녹음 파일 처리 시간 측정)
- [ ] 🟡 버그 수정 및 리팩토링

**Deliverables**:
- ✅ 녹음 → AI 자동 구조화 → D1/Vectorize 저장 완료
- ✅ 기본 녹음 UI 동작
- ✅ 한영 혼용 STT 정확도 > 90%

**Progress**: 0 / 42 tasks

---

## Phase 2: 메모 관리 UI 및 검색

**목표**: 저장된 메모 조회 및 기본 검색 기능
**Estimated Duration**: 3-4 iterations
**Branch**: `phase-2-ui`

### 2.1 GET /api/memos 엔드포인트 구현
- [ ] 🔴 GET `/api/memos` 라우트 추가
- [ ] 🔴 쿼리 파라미터 파싱 (`category`, `limit`, `offset`)
- [ ] 🔴 D1 쿼리 구현 (페이지네이션, 필터링)
  ```typescript
  const { results } = await env.DB.prepare(`
    SELECT id, title, summary, category, created_at
    FROM memos
    WHERE user_id = ? ${category ? 'AND category = ?' : ''}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).bind(userId, ...(category ? [category] : []), limit, offset).all();
  ```
- [ ] 🔴 전체 개수 조회 (페이지네이션용)
  ```typescript
  const { count } = await env.DB.prepare(`
    SELECT COUNT(*) as count FROM memos WHERE user_id = ?
  `).bind(userId).first();
  ```
- [ ] 🔴 응답 형식 구현 (`{ memos: [...], total: N }`)
- [ ] 🟡 에러 핸들링
- [ ] 🟡 Postman으로 API 테스트

### 2.2 메모 리스트 UI 구현
- [ ] 🔴 `app/memos/page.tsx` 페이지 생성
- [ ] 🔴 `components/MemoCard.tsx` 컴포넌트 생성
  - 카드 레이아웃 (제목, 카테고리 태그, 요약, 날짜)
  - 카테고리별 색상 코드 (Tailwind CSS)
- [ ] 🔴 GET `/api/memos` 호출 및 데이터 페칭 (React useEffect)
- [ ] 🔴 메모 리스트 렌더링 (map으로 MemoCard 반복)
- [ ] 🟡 로딩 상태 표시 (Skeleton UI)
- [ ] 🟡 빈 상태 처리 ("아직 메모가 없습니다")
- [ ] 🟡 무한 스크롤 또는 페이지네이션 구현

### 2.3 카테고리 필터링 구현
- [ ] 🔴 카테고리 드롭다운 또는 태그 버튼 UI
- [ ] 🔴 카테고리 선택 시 URL 쿼리 파라미터 업데이트 (`?category=개발`)
- [ ] 🔴 쿼리 파라미터에 따라 API 호출
- [ ] 🟡 "전체" 옵션 추가
- [ ] 🟡 선택된 카테고리 하이라이트 표시

### 2.4 GET /api/memos/:id 엔드포인트 구현
- [ ] 🔴 GET `/api/memos/:id` 라우트 추가
- [ ] 🔴 D1에서 메모 상세 조회
  ```typescript
  const memo = await env.DB.prepare(`
    SELECT * FROM memos WHERE id = ? AND user_id = ?
  `).bind(memoId, userId).first();
  ```
- [ ] 🔴 404 처리 (메모 없음 또는 권한 없음)
- [ ] 🔴 `action_items` JSON 파싱
- [ ] 🟡 API 테스트

### 2.5 메모 상세 페이지 구현
- [ ] 🔴 `app/memos/[id]/page.tsx` 동적 라우트 생성
- [ ] 🔴 메모 상세 정보 표시
  - 제목 (볼드, 큰 폰트)
  - 카테고리 태그
  - 생성일
  - 전체 전사 텍스트 (줄바꿈 처리)
  - 액션 아이템 (체크리스트 형태)
- [ ] 🟡 뒤로 가기 버튼
- [ ] 🟡 공유 버튼 (Future Enhancement - 비활성화)
- [ ] 🟡 반응형 디자인

### 2.6 DELETE /api/memos/:id 엔드포인트 구현
- [ ] 🔴 DELETE `/api/memos/:id` 라우트 추가
- [ ] 🔴 D1에서 메모 삭제
  ```typescript
  await env.DB.prepare(`
    DELETE FROM memos WHERE id = ? AND user_id = ?
  `).bind(memoId, userId).run();
  ```
- [ ] 🔴 Vectorize에서 벡터 삭제
  ```typescript
  await env.VECTORIZE.deleteByIds([memoId]);
  ```
- [ ] 🟡 삭제 성공 여부 확인 (affected rows)
- [ ] 🟡 에러 핸들링
- [ ] 🟡 API 테스트

### 2.7 메모 삭제 기능 UI
- [ ] 🔴 메모 상세 페이지에 삭제 버튼 추가
- [ ] 🔴 삭제 확인 다이얼로그 (Modal 또는 브라우저 confirm)
- [ ] 🔴 DELETE `/api/memos/:id` 호출
- [ ] 🔴 삭제 성공 시 메모 리스트 페이지로 리다이렉트
- [ ] 🟡 토스트 메시지 ("메모가 삭제되었습니다")
- [ ] 🟡 삭제 실패 시 에러 메시지

### 2.8 텍스트 검색 기능 (옵션)
- [ ] 🟢 검색창 UI (`app/memos/page.tsx`)
- [ ] 🟢 D1 LIKE 쿼리로 제목/요약 검색
  ```typescript
  WHERE (title LIKE '%' || ? || '%' OR summary LIKE '%' || ? || '%')
  ```
- [ ] 🟢 검색 결과 하이라이트 표시

### 2.9 네비게이션 및 레이아웃 개선
- [ ] 🔴 `components/Navbar.tsx` 컴포넌트 생성
  - 홈 (녹음 페이지)
  - 메모 목록
  - (Phase 3에서 추가될) 검색
- [ ] 🔴 `app/layout.tsx`에 Navbar 추가
- [ ] 🟡 모바일 햄버거 메뉴 (반응형)

### 2.10 Phase 2 테스트 및 디버깅
- [ ] 🔴 메모 리스트 조회 테스트
- [ ] 🔴 카테고리 필터링 테스트
- [ ] 🔴 메모 상세 보기 테스트
- [ ] 🔴 메모 삭제 테스트 (D1 및 Vectorize 확인)
- [ ] 🟡 UI/UX 개선 (디자인 리뷰)
- [ ] 🟡 접근성 테스트 (키보드 내비게이션 등)

**Deliverables**:
- ✅ 메모 리스트 및 상세 페이지 동작
- ✅ 카테고리 필터링 및 삭제 기능 완료
- ✅ 반응형 UI/UX

**Progress**: 0 / 38 tasks

---

## Phase 3: 대화형 검색 (RAG) 및 인증

**목표**: AI 기반 자연어 검색 및 사용자 격리
**Estimated Duration**: 4-5 iterations
**Branch**: `phase-3-rag`

### 3.1 POST /api/chat 엔드포인트 구현
- [ ] 🔴 POST `/api/chat` 라우트 추가
- [ ] 🔴 요청 바디 파싱 (`{ question: string }`)
- [ ] 🔴 질문 임베딩 생성 (Voyage API 호출)
  ```typescript
  const questionEmbedding = await generateEmbedding(question);
  ```
- [ ] 🔴 Vectorize 유사도 검색 (top-K=5)
  ```typescript
  const results = await env.VECTORIZE.query(questionEmbedding, {
    topK: 5,
    filter: { user_id: userId }
  });
  ```
- [ ] 🔴 검색된 메모 ID로 D1에서 상세 정보 조회
  ```typescript
  const memoIds = results.matches.map(m => m.id);
  const memos = await env.DB.prepare(`
    SELECT id, title, summary, raw_text FROM memos WHERE id IN (${memoIds.join(',')})
  `).all();
  ```
- [ ] 🔴 컨텍스트 구성 (메모 제목, 요약, 날짜)
- [ ] 🔴 Gemini API로 답변 생성 (RAG 프롬프트 사용)
  ```typescript
  const answer = await generateAnswer(question, context);
  ```
- [ ] 🔴 응답 형식 구현 (`{ answer: string, sources: Memo[] }`)
- [ ] 🟡 메모 없을 때 처리 ("관련 메모를 찾을 수 없습니다")
- [ ] 🟡 에러 핸들링
- [ ] 🟡 API 테스트 (다양한 질문으로)

### 3.2 채팅 UI 구현
- [ ] 🔴 `components/ChatInterface.tsx` 컴포넌트 생성
- [ ] 🔴 질문 입력창 + 전송 버튼 (하단 고정)
- [ ] 🔴 질문/답변 히스토리 표시 (useState로 관리)
  - 사용자 질문: 오른쪽 정렬, 파란색 말풍선
  - AI 답변: 왼쪽 정렬, 회색 말풍선
- [ ] 🔴 POST `/api/chat` 호출 및 응답 렌더링
- [ ] 🔴 관련 메모 링크 표시 (sources 배열)
  - 메모 제목 클릭 시 상세 페이지 이동
- [ ] 🟡 로딩 애니메이션 (타이핑 효과 또는 점 3개)
- [ ] 🟡 스크롤 자동 하단 이동 (새 메시지 추가 시)
- [ ] 🟡 Enter 키로 전송 (Shift+Enter는 줄바꿈)

### 3.3 검색 페이지 통합
- [ ] 🔴 `app/search/page.tsx` 페이지 생성
- [ ] 🔴 ChatInterface 컴포넌트 배치
- [ ] 🟡 채팅 히스토리 localStorage 저장 (세션 유지)
- [ ] 🟡 히스토리 초기화 버튼

### 3.4 Cloudflare Access 설정
- [ ] 🔴 Cloudflare Access 애플리케이션 생성
  - Application Type: Self-hosted
  - Application Domain: `vox-mind.yourdomain.com`
- [ ] 🔴 Access Policy 설정
  - Policy Name: "Vox Mind Users"
  - Include: Emails ending in `@yourdomain.com` (또는 개별 이메일)
  - Authentication Method: One-time PIN 또는 Google OAuth
- [ ] 🔴 Access 설정 문서화 (`docs/CLOUDFLARE_ACCESS_SETUP.md`)
- [ ] 🟡 테스트 계정으로 인증 흐름 테스트

### 3.5 JWT 검증 미들웨어 구현
- [ ] 🔴 `lib/auth-middleware.ts` 생성
- [ ] 🔴 Cloudflare Access JWT 검증 로직
  ```typescript
  const jwt = request.headers.get('Cf-Access-Jwt-Assertion');
  const payload = await verifyCloudflareJWT(jwt);
  const userId = payload.sub; // 또는 payload.email
  ```
- [ ] 🔴 모든 API 라우트에 미들웨어 적용
- [ ] 🔴 미인증 요청 시 401 Unauthorized 응답
- [ ] 🟡 JWT 만료 처리
- [ ] 🟡 테스트 (유효한/무효한 JWT)

### 3.6 사용자별 데이터 격리
- [ ] 🔴 모든 D1 쿼리에 `user_id` WHERE 조건 추가
  - GET `/api/memos`
  - GET `/api/memos/:id`
  - DELETE `/api/memos/:id`
  - POST `/api/process` (메모 저장 시)
- [ ] 🔴 Vectorize 검색 시 `user_id` 메타데이터 필터링
- [ ] 🟡 크로스 계정 접근 테스트 (다른 사용자 메모 조회 시도)

### 3.7 사용자 프로필 UI (옵션)
- [ ] 🟢 `app/profile/page.tsx` 페이지 생성
- [ ] 🟢 사용자 정보 표시 (이메일, 가입일)
- [ ] 🟢 통계 표시 (총 메모 개수, 카테고리별 분포)
- [ ] 🟢 로그아웃 버튼 (Cloudflare Access 로그아웃 페이지로 리다이렉트)

### 3.8 온보딩 가이드
- [ ] 🟡 `components/OnboardingModal.tsx` 컴포넌트 생성
- [ ] 🟡 첫 방문 시 사용법 안내 (localStorage로 표시 여부 관리)
  1. 녹음 방법
  2. AI 자동 구조화
  3. 검색 기능
- [ ] 🟡 스킵 버튼 및 다시 보지 않기 옵션

### 3.9 Phase 3 통합 테스트
- [ ] 🔴 전체 플로우 E2E 테스트 (인증 → 녹음 → 메모 조회 → 검색)
- [ ] 🔴 RAG 검색 정확도 테스트 (테스트 케이스 10개)
  - 질문 예시: "지난주 개발 아이디어 뭐였지?", "React 관련 메모 찾아줘"
  - Precision@3 계산
- [ ] 🔴 사용자 격리 테스트 (2개 이상의 테스트 계정)
- [ ] 🟡 성능 테스트 (1000개 메모 환경에서 검색 속도)
- [ ] 🟡 보안 테스트 (SQL Injection, XSS 등)

### 3.10 Phase 3 버그 수정 및 최적화
- [ ] 🟡 코드 리팩토링 (중복 제거, 타입 정의 개선)
- [ ] 🟡 에러 로깅 추가 (Cloudflare Workers Logs 활용)
- [ ] 🟡 API 응답 시간 최적화
- [ ] 🟡 UI/UX 개선 (사용자 피드백 반영)

**Deliverables**:
- ✅ 대화형 검색 (RAG) 완전 동작
- ✅ Cloudflare Access 인증 완료
- ✅ 사용자별 데이터 완전 격리
- ✅ Precision@3 > 80%

**Progress**: 0 / 42 tasks

---

## Phase 4: 배포 및 프로덕션 준비

**목표**: 프로덕션 환경 배포 및 모니터링
**Estimated Duration**: 2-3 iterations
**Branch**: `production`

### 4.1 환경 변수 및 시크릿 설정
- [ ] 🔴 Cloudflare Workers Secrets 설정
  ```bash
  wrangler secret put GROQ_API_KEY
  wrangler secret put GEMINI_API_KEY
  wrangler secret put VOYAGE_API_KEY
  ```
- [ ] 🔴 Next.js 환경 변수 설정 (Cloudflare Pages)
- [ ] 🟡 환경 변수 문서화 (`docs/ENVIRONMENT_VARIABLES.md`)

### 4.2 Cloudflare Pages 배포 설정
- [ ] 🔴 Cloudflare Pages 프로젝트 생성
- [ ] 🔴 GitHub 연동 (자동 배포 설정)
- [ ] 🔴 빌드 설정
  - Build command: `npm run build`
  - Build output directory: `.next` 또는 `out` (Static Export)
- [ ] 🔴 커스텀 도메인 설정 (옵션)
- [ ] 🟡 프리뷰 배포 테스트

### 4.3 Cloudflare Workers 배포
- [ ] 🔴 프로덕션 D1 데이터베이스 마이그레이션
  ```bash
  wrangler d1 migrations apply vox-mind-db --remote
  ```
- [ ] 🔴 Workers 배포
  ```bash
  wrangler deploy workers/api.ts
  ```
- [ ] 🟡 배포 성공 확인 (헬스 체크 엔드포인트)

### 4.4 모니터링 및 로깅
- [ ] 🔴 Cloudflare Workers Analytics 활성화
- [ ] 🟡 에러 추적 (Sentry 또는 Cloudflare Workers Logpush)
- [ ] 🟡 성능 모니터링 대시보드 설정
- [ ] 🟡 알림 설정 (에러율 임계값, API 응답 시간)

### 4.5 백업 및 복구 전략
- [ ] 🟡 D1 데이터베이스 백업 스크립트 작성
  ```bash
  wrangler d1 export vox-mind-db --output backup.sql
  ```
- [ ] 🟡 백업 자동화 (GitHub Actions 또는 Cloudflare Cron Triggers)
- [ ] 🟡 복구 절차 문서화

### 4.6 문서화
- [ ] 🔴 `README.md` 업데이트
  - 프로젝트 소개
  - 기능 설명
  - 로컬 개발 환경 설정
  - 배포 방법
- [ ] 🟡 `docs/API_DOCUMENTATION.md` 작성 (API 엔드포인트 명세)
- [ ] 🟡 `docs/ARCHITECTURE.md` 작성 (시스템 아키텍처 다이어그램)
- [ ] 🟡 `docs/TROUBLESHOOTING.md` 작성 (자주 발생하는 문제 해결)

### 4.7 성능 최적화
- [ ] 🟡 Next.js 이미지 최적화 (next/image 사용)
- [ ] 🟡 코드 스플리팅 (Dynamic Import)
- [ ] 🟡 CDN 캐싱 전략 (Cloudflare Cache Rules)
- [ ] 🟡 Lighthouse 스코어 개선 (Performance > 90)

### 4.8 보안 강화
- [ ] 🔴 HTTPS 강제 (Cloudflare Always Use HTTPS)
- [ ] 🔴 CSP (Content Security Policy) 헤더 설정
- [ ] 🟡 Rate Limiting 설정 (Cloudflare Rate Limiting Rules)
- [ ] 🟡 DDoS 방어 (Cloudflare DDoS Protection 활성화)

### 4.9 사용자 피드백 수집
- [ ] 🟡 피드백 버튼 추가 (Google Forms 또는 Typeform 링크)
- [ ] 🟡 Analytics 설정 (Google Analytics 또는 Cloudflare Web Analytics)
- [ ] 🟡 버그 리포트 템플릿 (GitHub Issues)

### 4.10 프로덕션 출시
- [ ] 🔴 프로덕션 환경 전체 테스트
- [ ] 🔴 베타 테스터 초대 (5-10명)
- [ ] 🔴 베타 테스트 피드백 수집 및 버그 수정
- [ ] 🔴 공식 출시 (Announcement)
- [ ] 🟡 출시 후 모니터링 (첫 주 집중 관찰)

**Deliverables**:
- ✅ 프로덕션 환경 완전 배포
- ✅ 모니터링 및 알림 설정 완료
- ✅ 문서화 완료
- ✅ 공식 출시

**Progress**: 0 / 30 tasks

---

## 📊 Overall Progress Summary

| Phase | Status | Progress | Key Milestones |
|-------|--------|----------|----------------|
| **Phase 0**: Setup | ⬜ Not Started | 0 / 14 | 환경 설정 완료 |
| **Phase 1**: Recording & AI | ⬜ Not Started | 0 / 42 | 녹음 → AI 파이프라인 동작 |
| **Phase 2**: UI & Search | ⬜ Not Started | 0 / 38 | 메모 관리 UI 완성 |
| **Phase 3**: RAG & Auth | ⬜ Not Started | 0 / 42 | RAG 검색 및 인증 완료 |
| **Phase 4**: Production | ⬜ Not Started | 0 / 30 | 프로덕션 출시 |
| **Total** | ⬜ 0% | 0 / 166 | MVP 완성 |

---

## 🎯 Next Steps

### 현재 우선순위
1. ✅ **Phase 0 시작**: 환경 설정 및 Cloudflare 리소스 생성
2. 이후 Phase 1부터 순차적으로 진행

### 추천 워크플로우
1. 각 Phase별로 브랜치 생성
2. 체크리스트 순서대로 작업 진행
3. 각 섹션 완료 시 커밋 (예: `git commit -m "Phase 1.3: Implement POST /api/upload"`)
4. Phase 완료 시 PR 생성 및 리뷰
5. main 브랜치에 머지 후 다음 Phase 시작

---

## 💡 Tips

- **작업 중단 시**: 현재 진행 중인 체크박스를 `[~]`로 표시하여 나중에 쉽게 찾기
- **블로커 발견 시**: 체크박스 옆에 `(BLOCKED: 이유)` 메모 추가
- **개선 아이디어**: 체크리스트 하단에 "Ideas" 섹션 추가하여 기록
- **시간 기록**: 각 Phase 시작/완료 시간을 기록하여 속도 파악

---

**Good luck with the implementation! 🚀**
