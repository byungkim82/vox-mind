import type { Env, MemoStructure } from './types';
import { STRUCTURE_MAX_TOKENS } from './constants';

const SYSTEM_PROMPT = `당신은 음성 메모를 분석하는 AI 어시스턴트입니다.
사용자가 녹음한 내용에서 핵심 정보를 추출하세요.

중요 규칙:
1. 한국어 문맥 속의 영어 단어나 기술 용어는 번역하지 말고 원문 그대로 유지하세요.
   예: "useState hook" → "useState hook" (O), "사용상태 후크" (X)
2. 횡설수설하거나 반복된 내용이 있어도 핵심만 추출하세요.
3. 액션 아이템은 명시적으로 언급된 것만 포함하세요.

다음 JSON 형식으로만 응답하세요:
{
  "title": "한 줄 제목 (20자 이내)",
  "summary": "핵심 요약 (2-3문장)",
  "category": "업무|개발|일기|아이디어|학습|기타 중 하나",
  "action_items": ["할 일 1", "할 일 2"]
}`;

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function structureWithWorkersAI(
  rawText: string,
  env: Env
): Promise<MemoStructure> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `다음 음성 메모를 분석해주세요:\n\n${rawText}` },
      ],
      max_tokens: STRUCTURE_MAX_TOKENS,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI Structure 실패: ${response.status} - ${errorText}`);
  }

  const result = (await response.json()) as OpenAIResponse;
  const content = result.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('OpenAI Structure: 응답 내용 없음');
  }

  const parsed = JSON.parse(content) as MemoStructure;

  if (!parsed.title || !parsed.summary || !parsed.category) {
    throw new Error('OpenAI Structure: 필수 필드 누락');
  }

  return parsed;
}
