import { NextRequest } from "next/server";
import { generateWithGPT } from "@/lib/openai";
import { generateWithClaude } from "@/lib/anthropic";

export const maxDuration = 300;

interface GenerateRequest {
  name: string;
  position: string;
  company: string;
  experience: string;
  skills: string;
  motivation: string;
}

export async function POST(request: NextRequest) {
  const body: GenerateRequest = await request.json();
  const { name, position, company, experience, skills, motivation } = body;

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
`;

  // Server-Sent Events로 스트리밍
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const sendResult = (result: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(result)}\n\n`));
      };

      // GPT 3개 + Claude 3개 = 6개 병렬 실행, 완료되는 대로 전송
      const tasks = [
        // GPT 3개
        ...Array.from({ length: 3 }, (_, i) => ({
          id: i + 1,
          model: "GPT-5.2" as const,
          fn: () => generateWithGPT(prompt + `\n\n[버전 ${i + 1}: 다른 관점으로 작성]`),
        })),
        // Claude 3개
        ...Array.from({ length: 3 }, (_, i) => ({
          id: i + 4,
          model: "Claude 4.5 Sonnet" as const,
          fn: () => generateWithClaude(prompt + `\n\n[버전 ${i + 1}: 다른 관점으로 작성]`),
        })),
      ];

      // 각 태스크를 병렬로 실행하고, 완료되는 대로 결과 전송
      await Promise.all(
        tasks.map(async (task) => {
          try {
            const content = await task.fn();
            sendResult({
              id: task.id,
              model: task.model,
              content,
              status: "success",
            });
          } catch (error) {
            sendResult({
              id: task.id,
              model: task.model,
              content: `오류 발생: ${error instanceof Error ? error.message : "알 수 없는 오류"}`,
              status: "error",
            });
          }
        })
      );

      // 완료 신호
      controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
