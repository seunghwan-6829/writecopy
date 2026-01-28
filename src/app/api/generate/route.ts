import { NextRequest, NextResponse } from "next/server";
import { generateWithGPT } from "@/lib/openai";
import { generateWithClaude } from "@/lib/anthropic";

export const maxDuration = 300; // Vercel Pro: 최대 300초 (5분)

interface GenerateRequest {
  name: string;
  position: string;
  company: string;
  experience: string;
  skills: string;
  motivation: string;
}

interface GenerationResult {
  id: number;
  model: "GPT-5.2" | "Claude 4.5 Sonnet";
  content: string;
  status: "success" | "error";
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();

    const { name, position, company, experience, skills, motivation } = body;

    // 프롬프트 생성
    const prompt = `
다음 정보를 바탕으로 자기소개서를 작성해주세요:

[지원자 정보]
- 이름: ${name}
- 지원 회사: ${company}
- 지원 직무: ${position}

[경력 및 경험]
${experience}

[보유 기술/역량]
${skills}

[지원 동기]
${motivation}

위 정보를 바탕으로 해당 회사와 직무에 맞는 설득력 있는 자기소개서를 작성해주세요.
각 버전마다 다른 관점이나 강조점으로 작성해주세요.
`;

    // 6개 동시 생성 (GPT 3개 + Claude 3개)
    const promises: Promise<GenerationResult>[] = [
      // GPT-5.2 x 3
      ...Array.from({ length: 3 }, (_, i) =>
        generateWithGPT(prompt + `\n\n[버전 ${i + 1}: 다른 관점으로 작성]`)
          .then((content) => ({
            id: i + 1,
            model: "GPT-5.2" as const,
            content,
            status: "success" as const,
          }))
          .catch((error) => ({
            id: i + 1,
            model: "GPT-5.2" as const,
            content: `오류 발생: ${error.message}`,
            status: "error" as const,
          }))
      ),
      // Claude 4.5 Sonnet x 3
      ...Array.from({ length: 3 }, (_, i) =>
        generateWithClaude(prompt + `\n\n[버전 ${i + 1}: 다른 관점으로 작성]`)
          .then((content) => ({
            id: i + 4,
            model: "Claude 4.5 Sonnet" as const,
            content,
            status: "success" as const,
          }))
          .catch((error) => ({
            id: i + 4,
            model: "Claude 4.5 Sonnet" as const,
            content: `오류 발생: ${error.message}`,
            status: "error" as const,
          }))
      ),
    ];

    // 모든 요청 병렬 실행
    const results = await Promise.all(promises);

    return NextResponse.json({
      success: true,
      results,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "알 수 없는 오류",
      },
      { status: 500 }
    );
  }
}
