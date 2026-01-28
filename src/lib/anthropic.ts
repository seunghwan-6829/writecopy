import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function generateWithClaude(prompt: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514", // Claude 4.5 Sonnet
    max_tokens: 2000,
    system: `당신은 전문 자기소개서 작성 전문가입니다. 
사용자의 정보를 바탕으로 설득력 있고, 진정성 있으며, 해당 직무에 최적화된 자기소개서를 작성해주세요.
- 구체적인 경험과 성과를 포함하세요
- 지원 직무와의 연관성을 명확히 하세요
- 자연스럽고 진정성 있는 문체를 사용하세요
- 500-800자 내외로 작성하세요`,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock && textBlock.type === "text"
    ? textBlock.text
    : "생성 실패";
}
