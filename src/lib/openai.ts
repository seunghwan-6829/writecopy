import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateWithGPT(prompt: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o", // GPT-4o (최신 안정 버전)
    messages: [
      {
        role: "system",
        content: `당신은 전문 자기소개서 작성 전문가입니다. 
사용자의 정보를 바탕으로 설득력 있고, 진정성 있으며, 해당 직무에 최적화된 자기소개서를 작성해주세요.
- 구체적인 경험과 성과를 포함하세요
- 지원 직무와의 연관성을 명확히 하세요
- 자연스럽고 진정성 있는 문체를 사용하세요
- 500-800자 내외로 작성하세요`,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    max_completion_tokens: 2000,
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content || "생성 실패";
}
