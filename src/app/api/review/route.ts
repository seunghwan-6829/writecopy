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

const REVIEW_PROMPT = `당신은 대기업 인사담당자 출신의 자기소개서 전문 컨설턴트입니다.
15년간 수만 건의 자기소개서를 검토하고 평가해온 경험을 바탕으로, 아래 자기소개서를 꼼꼼히 분석해주세요.

## 분석 형식 (반드시 아래 JSON 형식으로 응답)

{
  "overall_score": 85,
  "overall_comment": "전체적인 평가 코멘트 (2-3문장)",
  "strengths": [
    {
      "text": "잘 쓴 부분 원문 인용",
      "comment": "왜 좋은지 설명"
    }
  ],
  "improvements": [
    {
      "original": "수정이 필요한 부분 원문 인용",
      "suggestion": "이렇게 수정하면 좋겠습니다",
      "reason": "수정 이유"
    }
  ],
  "additions": [
    {
      "where": "어느 부분 뒤에 추가하면 좋을지",
      "content": "추가하면 좋을 내용",
      "reason": "추가 이유"
    }
  ],
  "appeal_points": [
    {
      "text": "더 강조하면 좋을 부분",
      "how": "이렇게 어필하면 더 효과적"
    }
  ],
  "warnings": [
    {
      "text": "주의해야 할 표현이나 내용",
      "reason": "왜 주의해야 하는지"
    }
  ]
}

## 분석 기준

1. **수정 필요 (improvements)**: 
   - 문법 오류, 어색한 표현
   - 추상적이거나 막연한 표현
   - 신뢰도가 낮아 보이는 부분
   - 클리셰나 진부한 표현

2. **추가 권장 (additions)**:
   - 구체적인 숫자나 성과가 빠진 부분
   - 스토리텔링이 약한 부분
   - 차별화 포인트가 부족한 부분

3. **어필 포인트 (appeal_points)**:
   - 이미 좋은데 더 강조하면 효과적인 부분
   - 면접에서 질문받을 만한 흥미로운 포인트

4. **주의 사항 (warnings)**:
   - 과장되어 보일 수 있는 표현
   - 검증하기 어려운 주장
   - 부정적으로 해석될 수 있는 부분

반드시 위의 JSON 형식만 출력하세요. 다른 텍스트는 포함하지 마세요.
`;

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();

    if (!content) {
      return NextResponse.json(
        { success: false, error: "자기소개서 내용이 없습니다." },
        { status: 400 }
      );
    }

    const openai = getOpenAIClient();

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: REVIEW_PROMPT,
        },
        {
          role: "user",
          content: `다음 자기소개서를 분석해주세요:\n\n${content}`,
        },
      ],
      max_completion_tokens: 4000,
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const reviewText = response.choices[0]?.message?.content || "{}";
    
    try {
      const review = JSON.parse(reviewText);
      return NextResponse.json({
        success: true,
        review,
      });
    } catch {
      return NextResponse.json({
        success: false,
        error: "분석 결과 파싱 실패",
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Review error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "분석 중 오류 발생",
      },
      { status: 500 }
    );
  }
}
