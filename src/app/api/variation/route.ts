import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 300;

const getOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY가 설정되지 않았습니다.");
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
};

const getAnthropicClient = () => {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY가 설정되지 않았습니다.");
  }
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
};

const VARIATION_PROMPT = `당신은 전문 자기소개서 컨설턴트입니다.

아래에 주어진 자기소개서를 바탕으로 **새로운 베리에이션**을 작성해주세요.

## 베리에이션 작성 규칙:

1. **핵심 내용은 유지**: 지원자의 경험, 역량, 지원동기의 핵심은 그대로 유지
2. **다른 관점으로 재구성**: 같은 이야기를 다른 각도에서 풀어나가기
3. **문체 변화**: 비슷하지만 다른 표현과 문장 구조 사용
4. **구조 재배치**: 강조점이나 순서를 약간 변경
5. **분량 유지**: 원본과 비슷한 길이 (최소 1,500자 이상)
6. **격식체 유지**: ~입니다, ~합니다 체 사용
7. **자연스러움**: 사람이 직접 다시 쓴 것처럼 자연스럽게

원본 자기소개서의 틀을 완전히 바꾸지 말고, 같은 스토리를 다른 방식으로 표현해주세요.
마치 같은 사람이 여러 번 다시 쓴 것처럼 느껴져야 합니다.

---

원본 자기소개서:
`;

interface VariationResult {
  id: number;
  model: "GPT-5.2" | "Claude 4.5 Sonnet";
  content: string;
  status: "success" | "error";
}

export async function POST(request: NextRequest) {
  try {
    const { originalContent, model } = await request.json();

    if (!originalContent) {
      return NextResponse.json(
        { success: false, error: "원본 자기소개서가 없습니다." },
        { status: 400 }
      );
    }

    const fullPrompt = VARIATION_PROMPT + originalContent;

    // 6개 베리에이션 생성 (GPT 3개 + Claude 3개)
    const promises: Promise<VariationResult>[] = [];

    // GPT 베리에이션 3개
    for (let i = 0; i < 3; i++) {
      promises.push(
        (async () => {
          try {
            const openai = getOpenAIClient();
            const response = await openai.chat.completions.create({
              model: "gpt-4o",
              messages: [
                { role: "system", content: fullPrompt },
                {
                  role: "user",
                  content: `베리에이션 ${i + 1}번을 작성해주세요. 이전 버전과 다른 관점이나 강조점으로 작성해주세요.`,
                },
              ],
              max_completion_tokens: 4000,
              temperature: 0.85,
            });
            return {
              id: i + 1,
              model: "GPT-5.2" as const,
              content: response.choices[0]?.message?.content || "생성 실패",
              status: "success" as const,
            };
          } catch (error) {
            return {
              id: i + 1,
              model: "GPT-5.2" as const,
              content: `오류 발생: ${error instanceof Error ? error.message : "알 수 없는 오류"}`,
              status: "error" as const,
            };
          }
        })()
      );
    }

    // Claude 베리에이션 3개
    for (let i = 0; i < 3; i++) {
      promises.push(
        (async () => {
          try {
            const anthropic = getAnthropicClient();
            const response = await anthropic.messages.create({
              model: "claude-sonnet-4-20250514",
              max_tokens: 4000,
              system: fullPrompt,
              messages: [
                {
                  role: "user",
                  content: `베리에이션 ${i + 1}번을 작성해주세요. 이전 버전과 다른 관점이나 강조점으로 작성해주세요.`,
                },
              ],
            });
            const textBlock = response.content.find((block) => block.type === "text");
            return {
              id: i + 4,
              model: "Claude 4.5 Sonnet" as const,
              content: textBlock && textBlock.type === "text" ? textBlock.text : "생성 실패",
              status: "success" as const,
            };
          } catch (error) {
            return {
              id: i + 4,
              model: "Claude 4.5 Sonnet" as const,
              content: `오류 발생: ${error instanceof Error ? error.message : "알 수 없는 오류"}`,
              status: "error" as const,
            };
          }
        })()
      );
    }

    const results = await Promise.all(promises);

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("Variation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "베리에이션 생성 중 오류",
      },
      { status: 500 }
    );
  }
}
