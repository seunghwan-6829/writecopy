import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const maxDuration = 120;

const getOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY가 설정되지 않았습니다.");
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
};

const TRANSLATION_PROMPT = `You are a professional translator specializing in Korean to English translation for business documents.

Your task is to translate a Korean cover letter (자기소개서) into natural, professional English.

## Translation Guidelines:

### 1. Tone & Style
- Use professional, formal business English
- Maintain the warmth and sincerity of the original text
- Sound natural, as if written by a native English speaker
- Avoid literal translations that sound awkward

### 2. Grammar & Structure
- Ensure perfect grammar and punctuation
- Use appropriate business idioms and expressions
- Maintain paragraph structure from the original
- Use active voice when possible

### 3. Cultural Adaptation
- Adapt Korean cultural expressions to Western business context
- Convert Korean-specific references to universally understood concepts
- Keep the personal touch while being professionally appropriate

### 4. Quality Standards
- The translation should read as if originally written in English
- Preserve the candidate's unique voice and personality
- Ensure consistency in tense and perspective
- Use varied vocabulary to avoid repetition

Translate the following Korean cover letter into professional English:`;

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json(
        { success: false, error: "번역할 텍스트가 없습니다." },
        { status: 400 }
      );
    }

    const openai = getOpenAIClient();
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: TRANSLATION_PROMPT,
        },
        {
          role: "user",
          content: text,
        },
      ],
      max_completion_tokens: 4000,
      temperature: 0.3, // 번역은 낮은 temperature로 정확하게
    });

    const translatedText = response.choices[0]?.message?.content || "번역 실패";

    return NextResponse.json({
      success: true,
      translatedText,
    });
  } catch (error) {
    console.error("Translation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "번역 중 오류 발생",
      },
      { status: 500 }
    );
  }
}
