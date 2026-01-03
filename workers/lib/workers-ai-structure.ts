import type { Env, MemoStructure, LlamaResponse } from './types';

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

export async function structureWithWorkersAI(
  rawText: string,
  env: Env
): Promise<MemoStructure> {
  const response = await env.AI.run('@cf/meta/llama-4-scout-17b-16e-instruct', {
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `다음 음성 메모를 분석해주세요:\n\n${rawText}` },
    ],
    max_tokens: 500,
    temperature: 0.3,
  }) as LlamaResponse;

  const text = response.response || '';

  // Extract JSON from markdown code blocks or direct JSON
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error('Workers AI Structure: JSON 추출 실패');
  }

  const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]) as MemoStructure;

  if (!parsed.title || !parsed.summary || !parsed.category) {
    throw new Error('Workers AI Structure: 필수 필드 누락');
  }

  return parsed;
}
