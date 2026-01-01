# Vox Mind - Product Requirements Document

**Version**: 1.0
**Last Updated**: 2026-01-01
**Project Lead**: TBD
**Status**: Draft

---

## 1. Executive Summary

### 1.1 Vision
Vox Mind는 **침묵에 끊기지 않는 녹음**과 **지능적 인출**을 제공하는 AI 기반 개인 음성 지식 베이스입니다. 깊은 사고가 필요한 순간의 긴 침묵에도 녹음이 중단되지 않으며, 횡설수설한 음성 메모를 AI가 자동으로 구조화하여 언제든 대화형 인터페이스로 과거의 기억을 즉시 인출할 수 있습니다.

### 1.2 핵심 가치 제안
- **무중단 녹음**: VAD(음성 활동 감지) 없이 사용자가 멈출 때까지 절대 끊기지 않는 녹음 환경
- **AI 자동 구조화**: Groq STT + Gemini LLM + Voyage Embedding을 활용한 지능적 메모 정리
- **Zero-Egress 인프라**: Cloudflare 네이티브 스택으로 거의 비용 부담 없는 운영 (월 $5 이하 목표)
- **대화형 검색**: RAG(Retrieval-Augmented Generation)를 통한 자연어 기반 과거 메모 인출

### 1.3 해결하는 문제
1. **기존 음성 메모 서비스의 VAD 한계**: 짧은 침묵에도 녹음이 종료되어 깊은 생각을 방해
2. **데이터 파편화**: 쌓인 음성 메모를 다시 찾기 어려운 문제
3. **높은 인프라 비용**: 개인 사용자가 감당하기 어려운 클라우드 전송료

---

## 2. Product Overview

### 2.1 배경
현대의 지식 노동자, 개발자, 연구자들은 빠르게 떠오르는 아이디어를 음성으로 기록하지만, 기존 서비스들은 다음과 같은 문제를 가지고 있습니다:

- **VAD 기반 자동 종료**: 생각하며 말할 때 발생하는 자연스러운 침묵을 "녹음 종료"로 인식
- **검색 불가능**: 텍스트 변환이 없거나, 있어도 단순 나열로 재검색이 어려움
- **비용 부담**: AWS/GCP의 egress fee로 인한 높은 운영 비용

### 2.2 목표
Vox Mind는 다음을 목표로 합니다:

1. **사용자 제어 녹음**: 침묵 여부와 무관하게 사용자가 명시적으로 중지할 때까지 녹음
2. **AI 기반 지식화**: STT → LLM 구조화 → Embedding을 통한 검색 가능한 지식 베이스 구축
3. **가성비 인프라**: Cloudflare의 Zero-Egress 정책과 고성능 저비용 AI API 활용

### 2.3 핵심 차별점
| 기능 | 기존 서비스 | Vox Mind |
|------|------------|----------|
| 녹음 지속성 | VAD로 자동 종료 | 사용자 제어 (무중단) |
| 텍스트 변환 | 없음 또는 단순 전사 | AI 구조화 (제목, 요약, 카테고리) |
| 검색 | 수동 스크롤 | 대화형 RAG 검색 |
| 비용 (월 100메모) | $10-50 | < $5 |

---

## 3. User Personas

### 3.1 Persona 1: Alex (개발자/엔지니어)
**기본 정보**
- 연령: 28세
- 직업: 풀스택 개발자
- 근무 환경: 재택 근무

**시나리오**
Alex는 코딩 중 갑자기 떠오른 아이디어를 빠르게 녹음합니다. 알고리즘 최적화 방법을 말하다가 10초간 침묵하며 생각을 정리한 후 다시 말을 이어갑니다. 기존 서비스는 이 침묵에 녹음을 종료했지만, Vox Mind는 그대로 기다립니다.

**Pain Points**
- 생각하며 말할 때 긴 침묵이 자주 발생
- 한국어와 영어를 혼용 (예: "useState hook을 사용해서 상태 관리를 해야겠어")
- 나중에 "저번 주에 생각한 Redis 캐싱 아이디어 뭐였지?" 같은 질문에 답을 찾기 어려움

**Needs**
- 침묵에 끊기지 않는 녹음
- 한영 혼용 텍스트 정확한 전사
- 자연어로 과거 아이디어 검색

### 3.2 Persona 2: Sarah (지식 노동자)
**기본 정보**
- 연령: 35세
- 직업: 프로덕트 매니저
- 근무 환경: 하이브리드

**시나리오**
Sarah는 회의 중 핵심 내용을 음성 메모로 기록합니다. 회의 후 "이번 분기 OKR 관련 논의 내용 정리해줘"라고 질문하면 Vox Mind가 관련 메모를 찾아 요약해줍니다.

**Pain Points**
- 회의 후 녹음 파일을 다시 듣는 데 시간 소요
- 액션 아이템을 수동으로 정리해야 함
- 과거 회의 내용 찾기 어려움

**Needs**
- 자동 요약 및 액션 아이템 추출
- 카테고리별 분류 (업무, 개인 등)
- 빠른 검색 및 인출

### 3.3 Persona 3: David (연구자/학생)
**기본 정보**
- 연령: 26세
- 직업: 대학원생 (컴퓨터 과학)
- 근무 환경: 연구실/도서관

**시나리오**
David는 논문을 읽으며 떠오르는 생각을 음성으로 메모합니다. "Transformer architecture와 BERT의 차이점"에 대해 나중에 질문하면 당시 녹음한 내용을 기반으로 답변을 받습니다.

**Pain Points**
- 논문 읽으며 메모한 내용이 파편화됨
- 나중에 관련 내용 찾기 어려움
- 긴 생각 정리 중 침묵 발생

**Needs**
- 학습 내용의 체계적 정리
- 주제별 검색
- 무중단 녹음

---

## 4. Technical Architecture

### 4.1 Infrastructure (Cloudflare Native)

```
┌─────────────────────────────────────────────────────────────┐
│                      User (Browser)                          │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ MediaRecorder│  │  Waveform UI │  │  Chat UI     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│               Cloudflare Pages (Next.js)                     │
│                    App Router + Tailwind CSS                 │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ Fetch API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│            Cloudflare Workers (Hono.js API)                  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Routes:                                               │  │
│  │ - POST /api/upload                                    │  │
│  │ - POST /api/process                                   │  │
│  │ - GET  /api/memos                                     │  │
│  │ - POST /api/chat                                      │  │
│  └──────────────────────────────────────────────────────┘  │
└────────┬────────────┬────────────┬────────────┬────────────┘
         │            │            │            │
         │ R2         │ D1         │ Vectorize  │ External APIs
         ▼            ▼            ▼            ▼
┌─────────────┐ ┌─────────┐ ┌──────────┐ ┌────────────────┐
│ Cloudflare  │ │Cloudflare│ │Cloudflare│ │ Groq (STT)     │
│ R2          │ │ D1       │ │Vectorize │ │ Gemini (LLM)   │
│ (임시 음성)  │ │(메타데이터)│ │(벡터 검색)│ │ Voyage (Embed) │
└─────────────┘ └─────────┘ └──────────┘ └────────────────┘
```

### 4.2 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 15 (App Router) | React 기반 SSR/SSG 프레임워크 |
| | Tailwind CSS | 유틸리티 기반 CSS 프레임워크 |
| | MediaRecorder API | 브라우저 네이티브 오디오 녹음 |
| **Backend** | Hono.js | Cloudflare Workers용 경량 웹 프레임워크 |
| **Hosting** | Cloudflare Pages | Frontend 정적 호스팅 |
| | Cloudflare Workers | Serverless 백엔드 실행 환경 |
| **Storage** | Cloudflare R2 | S3 호환 객체 스토리지 (임시 음성 파일) |
| | Cloudflare D1 | SQLite 기반 관계형 데이터베이스 |
| | Cloudflare Vectorize | 벡터 인덱스 및 유사도 검색 |
| **AI Services** | Groq (Whisper-large-v3-turbo) | 초고속 STT (한영 혼용 대응) |
| | Gemini 2.0 Flash | 텍스트 구조화 및 RAG 답변 생성 |
| | Voyage 3.5-lite | 고품질 임베딩 (Matryoshka 512차원) |
| **Authentication** | Cloudflare Access | Zero Trust 인증 |

### 4.3 Data Flow

#### 녹음 → AI 처리 → 저장
```
1. User starts recording (Frontend MediaRecorder)
2. User stops recording → Blob created
3. POST /api/upload → R2 저장 (fileId 반환)
4. POST /api/process { fileId }
   a. R2에서 파일 읽기
   b. Groq API → 텍스트 전사
   c. Gemini API → 구조화 (title, summary, category, action_items)
   d. Voyage API → summary 임베딩
   e. D1에 메타데이터 저장
   f. Vectorize에 벡터 저장 (memo_id, user_id 메타데이터)
   g. R2에서 원본 파일 삭제
5. Response: { memoId, title, summary, category }
```

#### 대화형 검색 (RAG)
```
1. User types question in chat UI
2. POST /api/chat { question }
   a. Voyage API → question 임베딩
   b. Vectorize 유사도 검색 (top 5)
   c. D1에서 해당 메모 조회 (raw_text, summary)
   d. Gemini API → context + question → answer
3. Response: { answer, sources: [memo1, memo2, ...] }
```

---

## 5. Functional Requirements

### 5.1 무중단 녹음 (Priority: P0)

#### FR-1.1: 브라우저 MediaRecorder API 활용
- **Description**: 사용자 디바이스에서 직접 오디오 스트림을 캡처합니다.
- **Acceptance Criteria**:
  - 브라우저 마이크 권한 요청 및 처리
  - `audio/webm` 또는 `audio/mp4` 형식 지원
  - 녹음 실패 시 명확한 에러 메시지 표시

#### FR-1.2: 침묵 감지 없이 사용자 제어 녹음
- **Description**: VAD(Voice Activity Detection) 없이 사용자가 "중지" 버튼을 클릭할 때까지 녹음을 지속합니다.
- **Acceptance Criteria**:
  - 10분 침묵에도 녹음 유지
  - 최대 녹음 시간: 60분 (제한 필요 시)
  - 녹음 중 페이지 이탈 시 경고 표시

#### FR-1.3: 실시간 피드백
- **Description**: 녹음 중임을 시각적으로 표시합니다.
- **Acceptance Criteria**:
  - Waveform 애니메이션 (실시간 오디오 레벨 표시)
  - 경과 시간 표시 (MM:SS 형식)
  - 녹음 중 상태 표시 (빨간 점 애니메이션)

#### FR-1.4: 파일 형식
- **Description**: 녹음 완료 시 표준 오디오 형식으로 Blob 생성
- **Acceptance Criteria**:
  - `.webm` (Chrome/Edge) 또는 `.mp4` (Safari) 지원
  - 파일 크기 제한: 50MB (약 60분 녹음)

---

### 5.2 AI 프로세싱 파이프라인 (Priority: P0)

#### FR-2.1: R2 임시 저장
- **Description**: 업로드된 음성 파일을 R2에 임시 저장합니다.
- **Acceptance Criteria**:
  - UUID 기반 파일명 생성
  - 업로드 완료 시 `fileId` 반환
  - 업로드 실패 시 재시도 로직

#### FR-2.2: Groq STT (한영 혼용 대응)
- **Description**: Groq Whisper-large-v3-turbo로 음성을 텍스트로 변환합니다.
- **Acceptance Criteria**:
  - 한국어와 영어 혼용 텍스트 정확하게 전사
  - Code-switching 대응 (예: "useState hook을 사용해서 상태 관리")
  - 전사 실패 시 fallback 처리 (Gemini STT 고려)

#### FR-2.3: Gemini 구조화
- **Description**: 전사된 텍스트를 의미 있는 구조로 변환합니다.
- **Acceptance Criteria**:
  - 다음 JSON 형식 출력:
    ```json
    {
      "title": "한 줄 제목 (20자 이내)",
      "summary": "핵심 요약 (2-3문장)",
      "category": "업무|개발|일기|아이디어|학습|기타",
      "action_items": ["할 일 1", "할 일 2"]
    }
    ```
  - 영어 기술 용어는 번역하지 않고 원문 유지
  - 횡설수설한 내용에서도 핵심 추출

#### FR-2.4: Voyage 임베딩
- **Description**: 요약문을 512차원 벡터로 변환합니다.
- **Acceptance Criteria**:
  - Voyage 3.5-lite API 호출
  - Matryoshka 512차원 사용
  - 임베딩 실패 시 재시도 (최대 3회)

#### FR-2.5: D1 및 Vectorize 저장
- **Description**: 구조화된 데이터를 D1에, 벡터를 Vectorize에 저장합니다.
- **Acceptance Criteria**:
  - D1 트랜잭션 처리
  - Vectorize에 `memo_id`, `user_id` 메타데이터 함께 저장
  - 저장 실패 시 롤백

#### FR-2.6: R2 원본 파일 삭제
- **Description**: 처리 완료 후 R2에서 음성 파일을 즉시 삭제합니다.
- **Acceptance Criteria**:
  - D1 및 Vectorize 저장 성공 확인 후 삭제
  - 삭제 실패 시 로그 기록 (수동 정리 대비)

---

### 5.3 메모 관리 UI (Priority: P0)

#### FR-3.1: 메모 리스트
- **Description**: 최신순으로 메모 카드를 표시합니다.
- **Acceptance Criteria**:
  - 무한 스크롤 또는 페이지네이션
  - 카드당 표시 정보: 제목, 카테고리, 요약 (100자), 생성일
  - 로딩 상태 표시

#### FR-3.2: AI 제목 및 카테고리 표시
- **Description**: AI가 생성한 제목과 카테고리를 시각적으로 강조합니다.
- **Acceptance Criteria**:
  - 카테고리별 색상 코드 (예: 업무=파랑, 개발=초록)
  - 제목은 볼드 처리

#### FR-3.3: 카테고리 필터링
- **Description**: 특정 카테고리만 필터링하여 표시합니다.
- **Acceptance Criteria**:
  - 카테고리 선택 드롭다운 또는 태그 클릭
  - "전체" 옵션 포함
  - URL 쿼리 파라미터로 상태 유지

#### FR-3.4: 메모 상세 보기
- **Description**: 개별 메모의 전체 내용을 표시합니다.
- **Acceptance Criteria**:
  - 전체 전사 텍스트 표시
  - 액션 아이템 체크리스트 형태로 표시
  - 생성일 및 메타데이터 표시

#### FR-3.5: 메모 삭제
- **Description**: 사용자가 메모를 삭제할 수 있습니다.
- **Acceptance Criteria**:
  - 삭제 확인 다이얼로그
  - D1 및 Vectorize에서 모두 삭제
  - 삭제 후 리스트 자동 갱신

---

### 5.4 대화형 검색 (RAG) (Priority: P0)

#### FR-4.1: 채팅 인터페이스
- **Description**: 하단 고정 채팅창에서 자연어 질문 입력
- **Acceptance Criteria**:
  - 텍스트 입력창 + 전송 버튼
  - 질문 및 답변 히스토리 표시
  - 로딩 애니메이션 (답변 생성 중)

#### FR-4.2: Vectorize 유사도 검색
- **Description**: 질문을 임베딩하여 관련 메모 검색
- **Acceptance Criteria**:
  - Voyage API로 질문 임베딩
  - Vectorize에서 top-K (K=5) 검색
  - user_id 필터링 (본인 메모만)

#### FR-4.3: Gemini 답변 생성
- **Description**: 검색된 메모를 컨텍스트로 답변 생성
- **Acceptance Criteria**:
  - 시스템 프롬프트: "과거 메모를 바탕으로 답변"
  - 메모에 정보 없으면 "관련 메모를 찾을 수 없습니다" 반환
  - 답변 길이: 최대 500자

#### FR-4.4: 관련 메모 링크
- **Description**: 답변과 함께 참고한 메모 링크 제공
- **Acceptance Criteria**:
  - 최대 3개 메모 카드 표시
  - 클릭 시 메모 상세 페이지 이동
  - 메모 제목 및 생성일 표시

---

### 5.5 사용자 인증 (Priority: P0)

#### FR-5.1: Cloudflare Access 통합
- **Description**: Cloudflare Access로 Zero Trust 인증 구현
- **Acceptance Criteria**:
  - 이메일 기반 OTP 또는 Google SSO
  - 인증되지 않은 사용자는 앱 접근 불가
  - Access Policy 설정 문서 제공

#### FR-5.2: 사용자별 데이터 격리
- **Description**: 모든 API 요청에 `user_id` 필터링 적용
- **Acceptance Criteria**:
  - Cloudflare Access JWT에서 `user_id` 추출
  - D1 쿼리에 `WHERE user_id = ?` 적용
  - Vectorize 메타데이터 필터링

#### FR-5.3: 접근 제어
- **Description**: 인증된 사용자만 앱 사용 가능
- **Acceptance Criteria**:
  - 미인증 시 Cloudflare Access 로그인 페이지 리다이렉트
  - API 호출 시 JWT 검증
  - JWT 만료 시 재인증 유도

---

## 6. Non-Functional Requirements

### 6.1 성능

#### NFR-1.1: STT 처리 시간
- **Requirement**: STT 처리 시간 < 녹음 길이의 20%
- **Example**: 5분 녹음 → 1분 이내 전사 완료
- **Measurement**: Groq API 응답 시간 모니터링

#### NFR-1.2: AI 구조화 시간
- **Requirement**: Gemini 구조화 완료 시간 < 10초
- **Measurement**: `/api/process` 엔드포인트 응답 시간

#### NFR-1.3: 검색 응답 시간
- **Requirement**: RAG 검색 답변 생성 < 3초
- **Measurement**: `/api/chat` 엔드포인트 응답 시간

### 6.2 확장성

#### NFR-2.1: 자동 스케일링
- **Requirement**: Cloudflare Workers의 자동 스케일링 활용
- **Details**: 동시 사용자 증가 시 추가 설정 없이 확장

#### NFR-2.2: 벡터 검색 성능
- **Requirement**: 10,000개 메모까지 < 100ms 검색 속도 유지
- **Details**: Vectorize 인덱스 최적화

### 6.3 비용

#### NFR-3.1: Zero-Egress 정책
- **Requirement**: Cloudflare R2 사용으로 전송료 0원
- **Details**: R2 → Workers 간 전송료 없음

#### NFR-3.2: 월간 비용 목표
- **Requirement**: 월 100개 메모 기준 < $5
- **Breakdown**:
  - Groq STT: ~$1 (100분 기준)
  - Gemini API: ~$1 (100회 호출)
  - Voyage Embedding: ~$0.5 (100회)
  - CF Workers/D1/Vectorize: ~$1 (Free tier 초과분)

### 6.4 보안

#### NFR-4.1: API 키 관리
- **Requirement**: 모든 API 키는 환경 변수로 관리
- **Details**: `.env.local` (로컬), Cloudflare Workers Secrets (프로덕션)

#### NFR-4.2: 데이터 최소화
- **Requirement**: R2 원본 파일은 처리 후 즉시 삭제
- **Details**: 개인정보 보호 및 스토리지 비용 절감

#### NFR-4.3: 앱 레벨 보안
- **Requirement**: Cloudflare Access로 전체 앱 보호
- **Details**: 인증되지 않은 요청은 프론트엔드 접근 불가

### 6.5 사용성

#### NFR-5.1: 반응형 디자인
- **Requirement**: 모바일 브라우저 (iOS Safari, Android Chrome) 지원
- **Details**: Tailwind CSS 브레이크포인트 활용

#### NFR-5.2: 직관적 UI/UX
- **Requirement**: 신규 사용자가 5분 내 녹음 → 검색까지 완료 가능
- **Details**: 온보딩 가이드 및 툴팁 제공

---

## 7. Data Schema

### 7.1 D1 Database

#### Table: `memos`
```sql
CREATE TABLE memos (
  id TEXT PRIMARY KEY,              -- UUID (예: 550e8400-e29b-41d4-a716-446655440000)
  user_id TEXT NOT NULL,            -- Cloudflare Access JWT sub claim
  raw_text TEXT NOT NULL,           -- Groq STT로 전사된 전체 텍스트
  title TEXT,                       -- Gemini 생성 제목 (20자 이내)
  summary TEXT,                     -- Gemini 생성 요약 (2-3문장)
  category TEXT,                    -- 업무|개발|일기|아이디어|학습|기타
  action_items TEXT,                -- JSON 배열 문자열 (예: '["할 일 1", "할 일 2"]')
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스
CREATE INDEX idx_user_created ON memos(user_id, created_at DESC);
CREATE INDEX idx_category ON memos(category);
CREATE INDEX idx_user_category ON memos(user_id, category);
```

#### Example Row
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "google-oauth2|123456789",
  "raw_text": "오늘 useState hook을 사용해서 상태 관리를 하려고 하는데... (10초 침묵) ...useReducer를 쓰는 게 나을 것 같아. 복잡한 상태 로직이니까.",
  "title": "React 상태 관리 고민",
  "summary": "useState와 useReducer 중 선택 고민. 복잡한 상태 로직이므로 useReducer가 적합하다고 판단.",
  "category": "개발",
  "action_items": "[\"useReducer 예제 코드 작성\"]",
  "created_at": "2026-01-01 10:30:00",
  "updated_at": "2026-01-01 10:30:00"
}
```

### 7.2 Vectorize Index

#### Index Configuration
```typescript
{
  name: "vox-mind-embeddings",
  dimensions: 512,               // Voyage 3.5-lite Matryoshka 512
  metric: "cosine"               // 코사인 유사도
}
```

#### Vector Entry
```typescript
{
  id: "550e8400-e29b-41d4-a716-446655440000",  // memo.id
  values: [0.123, -0.456, ...],                // 512차원 벡터
  metadata: {
    memo_id: "550e8400-e29b-41d4-a716-446655440000",
    user_id: "google-oauth2|123456789"
  }
}
```

### 7.3 R2 Bucket

#### Bucket Name
```
vox-mind-audio-temp
```

#### File Structure
```
/{fileId}.webm  (예: /550e8400-e29b-41d4-a716-446655440000.webm)
```

#### Lifecycle Policy
- 처리 완료 후 즉시 삭제 (애플리케이션 레벨)
- Fallback: 24시간 후 자동 삭제 (R2 Lifecycle Rule)

---

## 8. Development Phases

### Phase 1: 핵심 녹음 및 AI 파이프라인
**목표**: 녹음 → STT → AI 구조화 → 저장 플로우 구현

#### Tasks
1. **프로젝트 초기 설정**
   - `wrangler.toml` 설정 (D1, R2, Vectorize 바인딩)
   - Next.js 프로젝트 생성 (`create-next-app`)
   - Hono.js 백엔드 초기화

2. **MediaRecorder 녹음 UI**
   - 녹음 시작/중지 버튼
   - Waveform 애니메이션 (Canvas API 또는 라이브러리)
   - 경과 시간 표시

3. **Hono.js API 구현**
   - `POST /api/upload`: R2에 파일 저장
   - `POST /api/process`: AI 파이프라인 실행
     - Groq STT
     - Gemini 구조화
     - Voyage 임베딩
     - D1 + Vectorize 저장
     - R2 삭제

4. **외부 API 연동**
   - Groq API 클라이언트
   - Gemini API 클라이언트
   - Voyage API 클라이언트

5. **D1 스키마 마이그레이션**
   - `memos` 테이블 생성
   - 인덱스 생성

#### Success Criteria
- 녹음 → 자동 구조화 → D1/Vectorize 저장 완료
- 콘솔에서 저장된 데이터 확인 가능

#### Estimated Effort
- 설정 및 구조: 1 iteration
- 녹음 UI: 1 iteration
- API 파이프라인: 2 iterations
- 테스트 및 디버깅: 1 iteration

---

### Phase 2: 메모 관리 UI 및 검색
**목표**: 저장된 메모 조회 및 기본 검색 기능

#### Tasks
1. **메모 리스트 페이지**
   - `GET /api/memos` 엔드포인트
   - 카드 형태 UI (title, category, summary, created_at)
   - 무한 스크롤 또는 페이지네이션

2. **카테고리 필터링**
   - 드롭다운 또는 태그 클릭
   - URL 쿼리 파라미터 (`?category=개발`)

3. **메모 상세 페이지**
   - `GET /api/memos/:id` 엔드포인트
   - 전체 전사 텍스트 표시
   - 액션 아이템 체크리스트

4. **메모 삭제**
   - `DELETE /api/memos/:id` 엔드포인트
   - 확인 다이얼로그
   - D1 + Vectorize 삭제

5. **텍스트 검색 (옵션)**
   - D1 `LIKE` 쿼리로 제목/요약 검색

#### Success Criteria
- 메모 리스트에서 카테고리 필터링 가능
- 메모 상세 보기 및 삭제 가능

#### Estimated Effort
- 리스트 UI: 1 iteration
- 상세 페이지: 1 iteration
- 삭제 기능: 0.5 iteration
- 테스트: 0.5 iteration

---

### Phase 3: 대화형 검색 (RAG) 및 인증
**목표**: AI 기반 자연어 검색 및 사용자 격리

#### Tasks
1. **채팅 UI**
   - 하단 고정 채팅창
   - 질문/답변 히스토리 표시
   - 로딩 애니메이션

2. **RAG 파이프라인**
   - `POST /api/chat` 엔드포인트
   - Voyage 질문 임베딩
   - Vectorize 유사도 검색 (top-5)
   - Gemini 답변 생성
   - 관련 메모 링크 반환

3. **Cloudflare Access 통합**
   - Access Policy 설정
   - JWT 검증 미들웨어
   - `user_id` 추출 및 필터링

4. **사용자별 데이터 격리**
   - 모든 API에 `user_id` WHERE 조건 추가
   - Vectorize 메타데이터 필터링

5. **온보딩 가이드**
   - 첫 방문자용 간단한 사용 설명

#### Success Criteria
- 자연어 질문에 과거 메모 기반 답변 제공
- 사용자별 데이터 완전 격리
- Cloudflare Access로 인증 완료

#### Estimated Effort
- 채팅 UI: 1 iteration
- RAG 파이프라인: 2 iterations
- Cloudflare Access: 1 iteration
- 데이터 격리: 1 iteration
- 테스트: 1 iteration

---

## 9. API Endpoints

### 9.1 POST /api/upload
**Description**: 녹음된 음성 파일을 R2에 업로드

**Request**
```http
POST /api/upload
Content-Type: multipart/form-data

file: (binary audio file)
```

**Response**
```json
{
  "fileId": "550e8400-e29b-41d4-a716-446655440000",
  "uploadedAt": "2026-01-01T10:30:00Z"
}
```

**Error Responses**
- `400 Bad Request`: 파일 누락 또는 형식 오류
- `413 Payload Too Large`: 파일 크기 > 50MB
- `500 Internal Server Error`: R2 업로드 실패

---

### 9.2 POST /api/process
**Description**: 업로드된 파일을 STT → LLM → Embedding 처리

**Request**
```json
{
  "fileId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response**
```json
{
  "memoId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "React 상태 관리 고민",
  "summary": "useState와 useReducer 중 선택 고민...",
  "category": "개발",
  "actionItems": ["useReducer 예제 코드 작성"]
}
```

**Error Responses**
- `404 Not Found`: fileId가 R2에 없음
- `500 Internal Server Error`: STT/LLM/Embedding 실패

---

### 9.3 GET /api/memos
**Description**: 메모 리스트 조회 (페이지네이션, 필터링)

**Request**
```http
GET /api/memos?category=개발&limit=20&offset=0
```

**Query Parameters**
- `category` (optional): 카테고리 필터
- `limit` (optional, default: 20): 페이지 크기
- `offset` (optional, default: 0): 페이지 오프셋

**Response**
```json
{
  "memos": [
    {
      "id": "550e8400-...",
      "title": "React 상태 관리 고민",
      "summary": "useState와 useReducer...",
      "category": "개발",
      "createdAt": "2026-01-01T10:30:00Z"
    }
  ],
  "total": 42
}
```

---

### 9.4 GET /api/memos/:id
**Description**: 메모 상세 조회

**Request**
```http
GET /api/memos/550e8400-e29b-41d4-a716-446655440000
```

**Response**
```json
{
  "memo": {
    "id": "550e8400-...",
    "rawText": "오늘 useState hook을...",
    "title": "React 상태 관리 고민",
    "summary": "useState와 useReducer...",
    "category": "개발",
    "actionItems": ["useReducer 예제 코드 작성"],
    "createdAt": "2026-01-01T10:30:00Z"
  }
}
```

**Error Responses**
- `404 Not Found`: 메모 없음 또는 다른 사용자의 메모

---

### 9.5 DELETE /api/memos/:id
**Description**: 메모 삭제 (D1 + Vectorize)

**Request**
```http
DELETE /api/memos/550e8400-e29b-41d4-a716-446655440000
```

**Response**
```json
{
  "success": true
}
```

**Error Responses**
- `404 Not Found`: 메모 없음
- `500 Internal Server Error`: 삭제 실패

---

### 9.6 POST /api/chat
**Description**: 자연어 질문에 RAG 기반 답변 생성

**Request**
```json
{
  "question": "지난주 개발 아이디어 뭐였지?"
}
```

**Response**
```json
{
  "answer": "지난주에 React 상태 관리에 대해 고민하셨습니다. useState 대신 useReducer를 사용하는 것이 복잡한 상태 로직에 적합하다고 판단하셨고, 예제 코드를 작성하기로 하셨습니다.",
  "sources": [
    {
      "id": "550e8400-...",
      "title": "React 상태 관리 고민",
      "createdAt": "2026-01-01T10:30:00Z"
    }
  ]
}
```

**Error Responses**
- `400 Bad Request`: question 누락
- `500 Internal Server Error`: 임베딩/검색/LLM 실패

---

## 10. AI Prompts

### 10.1 Gemini 구조화 프롬프트

**System Prompt**
```
당신은 음성 메모를 분석하는 AI 어시스턴트입니다.
사용자가 녹음한 내용에서 핵심 정보를 추출하세요.

중요 규칙:
1. 한국어 문맥 속의 영어 단어나 기술 용어는 번역하지 말고 원문 그대로 유지하세요.
   예: "useState hook" → "useState hook" (O), "사용상태 후크" (X)
2. 횡설수설하거나 반복된 내용이 있어도 핵심만 추출하세요.
3. 액션 아이템은 명시적으로 언급된 것만 포함하세요.

다음 JSON 형식으로 응답하세요:
{
  "title": "한 줄 제목 (20자 이내)",
  "summary": "핵심 요약 (2-3문장)",
  "category": "업무|개발|일기|아이디어|학습|기타 중 하나",
  "action_items": ["할 일 1", "할 일 2"]  // 없으면 빈 배열
}
```

**User Prompt**
```
다음 음성 메모를 분석해주세요:

{raw_text}
```

**Example Input**
```
오늘 useState hook을 사용해서 상태 관리를 하려고 하는데... 음... 뭔가 복잡해지는 것 같아.
(10초 침묵)
아, useReducer를 쓰는 게 나을 것 같아. 복잡한 상태 로직이니까. 내일 예제 코드 작성해봐야겠다.
```

**Example Output**
```json
{
  "title": "React 상태 관리 고민",
  "summary": "useState와 useReducer 중 선택 고민. 복잡한 상태 로직이므로 useReducer가 적합하다고 판단.",
  "category": "개발",
  "action_items": ["useReducer 예제 코드 작성"]
}
```

---

### 10.2 RAG 답변 생성 프롬프트

**System Prompt**
```
당신은 사용자의 과거 음성 메모를 바탕으로 질문에 답하는 AI 어시스턴트입니다.

규칙:
1. 제공된 메모만을 참고하여 답변하세요.
2. 메모에 정보가 없으면 "관련 메모를 찾을 수 없습니다"라고 답하세요.
3. 답변은 친절하고 구체적으로 작성하세요.
4. 답변 길이는 최대 500자로 제한하세요.
```

**User Prompt**
```
사용자 질문: {question}

관련 메모:
---
메모 1 (제목: {title1}, 날짜: {date1})
{summary1}

메모 2 (제목: {title2}, 날짜: {date2})
{summary2}
---

위 메모를 참고하여 질문에 답변하세요.
```

**Example Input**
```
사용자 질문: 지난주 개발 아이디어 뭐였지?

관련 메모:
---
메모 1 (제목: React 상태 관리 고민, 날짜: 2025-12-25)
useState와 useReducer 중 선택 고민. 복잡한 상태 로직이므로 useReducer가 적합하다고 판단.

메모 2 (제목: API 캐싱 전략, 날짜: 2025-12-26)
Redis를 사용한 API 응답 캐싱 고려. TTL 5분으로 설정하여 DB 부하 감소.
---
```

**Example Output**
```
지난주에 두 가지 개발 아이디어를 메모하셨습니다:

1. **React 상태 관리**: useState 대신 useReducer를 사용하는 것이 복잡한 상태 로직에 적합하다고 판단하셨습니다.

2. **API 캐싱 전략**: Redis를 활용하여 API 응답을 캐싱하고, TTL을 5분으로 설정하여 DB 부하를 줄이는 방안을 고려하셨습니다.
```

---

## 11. Success Metrics

### 11.1 기술적 지표

#### STT 정확도
- **Target**: > 95% (한국어/영어 혼용)
- **Measurement**: 샘플 메모 10개에 대해 수동 전사와 비교

#### AI 구조화 품질
- **Target**: 사용자 만족도 > 4.0/5.0
- **Measurement**: 사용자 설문 ("AI가 생성한 제목과 요약이 적절한가?")

#### 검색 정확도
- **Target**: Precision@3 > 80%
- **Measurement**: 테스트 질문 20개에 대해 상위 3개 메모 중 관련 메모 비율

### 11.2 사용자 지표

#### 주간 활성 사용자 (WAU)
- **Target**: 출시 3개월 내 100명
- **Measurement**: Cloudflare Analytics

#### 메모당 평균 길이
- **Target**: 2-5분
- **Measurement**: D1 쿼리 (`AVG(LENGTH(raw_text))`)

#### 검색 사용 빈도
- **Target**: 전체 사용자의 50% 이상이 주 1회 이상 검색
- **Measurement**: `/api/chat` 호출 로그 분석

### 11.3 비용 지표

#### 월간 인프라 비용
- **Target**: < $5 (사용자당, 월 100개 메모 기준)
- **Measurement**: Cloudflare 청구서 + 외부 API 비용 합산

#### API 호출 비용
- **Breakdown**:
  - Groq STT: $0.01/분 → $1 (100분)
  - Gemini API: $0.01/호출 → $1 (100회)
  - Voyage Embedding: $0.005/호출 → $0.5 (100회)

---

## 12. Risks & Mitigations

| 리스크 | 영향도 | 발생 가능성 | 완화 방안 |
|--------|--------|------------|-----------|
| **Groq API 할당량 초과** | 높음 | 중간 | Fallback으로 Gemini STT 준비. 할당량 모니터링 알림 설정. |
| **긴 녹음 파일 처리 시간** | 중간 | 높음 | 진행 상태 표시 UI. 백그라운드 처리 (Worker Queue 고려). |
| **Vectorize 검색 품질 저하** | 중간 | 낮음 | 하이브리드 검색 (키워드 + 벡터). 사용자 피드백 수집. |
| **Cloudflare Access 설정 복잡도** | 낮음 | 중간 | 상세 문서 및 스크린샷 제공. 예제 Policy 공유. |
| **한영 혼용 STT 정확도 문제** | 중간 | 낮음 | Groq Whisper-large-v3-turbo는 Code-switching 지원. 테스트로 검증. |
| **사용자 채택률 저조** | 높음 | 중간 | 온보딩 최적화. 초기 사용자 인터뷰로 Pain Point 파악. |

---

## 13. Future Enhancements (Out of Scope for MVP)

### Phase 4: 고급 기능
- **실시간 전사 (Streaming STT)**: 녹음 중 실시간으로 텍스트 표시
- **메모 편집**: 사용자가 AI 생성 제목/요약 수정 가능
- **공유 기능**: 특정 메모를 외부에 공유 (URL 생성)

### Phase 5: 모바일 최적화
- **PWA (Progressive Web App)**: 홈 화면 추가, 오프라인 녹음
- **React Native 앱**: iOS/Android 네이티브 앱

### Phase 6: 확장 기능
- **음성 파일 재생**: 원본 음성 파일 보관 및 재생 (옵션)
- **다국어 지원 확대**: 일본어, 중국어 등
- **음성 기반 검색 (Voice Query)**: 음성으로 질문 입력
- **태그 시스템**: 사용자 정의 태그 추가
- **메모 병합**: 여러 메모를 하나로 병합

---

## 14. Appendix

### 14.1 Glossary
- **VAD (Voice Activity Detection)**: 음성 활동 감지 기술
- **STT (Speech-to-Text)**: 음성-텍스트 변환
- **LLM (Large Language Model)**: 대규모 언어 모델
- **RAG (Retrieval-Augmented Generation)**: 검색 증강 생성
- **Embedding**: 텍스트를 고차원 벡터로 변환
- **Code-switching**: 한 문장 내에서 두 언어 혼용
- **Zero-Egress**: 데이터 전송료 무료 정책

### 14.2 References
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Cloudflare Vectorize Docs](https://developers.cloudflare.com/vectorize/)
- [Groq API Docs](https://console.groq.com/docs)
- [Gemini API Docs](https://ai.google.dev/docs)
- [Voyage AI Docs](https://docs.voyageai.com/)
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)

### 14.3 Changelog
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-01 | TBD | Initial PRD draft |

---

## 15. Approval & Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Product Owner | | | |
| Technical Lead | | | |
| Stakeholder | | | |

---

**End of Document**
