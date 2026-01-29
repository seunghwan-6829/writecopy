import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function generateIDPhoto(
  imageBase64: string,
  outfit: string,
  backgroundColor: string = "white"
): Promise<{ success: boolean; images?: string[]; error?: string }> {
  try {
    // Gemini 2.0 Flash 모델 사용 (이미지 입력 + 출력 지원)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp-image-generation",
      generationConfig: {
        responseModalities: ["Text", "Image"],
      } as any,
    });

    const outfitDescriptions: Record<string, string> = {
      suit_black: "검정색 정장과 흰색 셔츠를 입은",
      suit_navy: "네이비색 정장과 흰색 셔츠를 입은",
      suit_gray: "회색 정장과 흰색 셔츠를 입은",
      shirt_white: "깔끔한 흰색 셔츠를 입은",
      blouse: "단정한 블라우스를 입은",
      casual: "비즈니스 캐주얼 스타일의",
    };

    const outfitDesc = outfitDescriptions[outfit] || "정장을 입은";

    // Base64 이미지에서 데이터 부분만 추출
    const base64Data = imageBase64.includes(",") 
      ? imageBase64.split(",")[1] 
      : imageBase64;

    const prompt = `**[최우선 지침 - 반드시 준수]**
이 사진 속 인물의 얼굴을 절대로 변경하지 마세요. 원본 얼굴 픽셀을 그대로 유지하고, 배경과 의상만 교체하세요.

**[얼굴 보존 - 절대 규칙]:**
이 사람의 실제 얼굴입니다. 다른 사람 얼굴로 바꾸지 마세요!
- 이 사람의 정확한 눈 모양, 눈 크기, 눈 간격을 유지
- 이 사람의 정확한 코 모양, 코 크기, 콧대를 유지  
- 이 사람의 정확한 입술 모양, 입술 두께를 유지
- 이 사람의 정확한 얼굴형, 턱선, 광대뼈를 유지
- 이 사람의 정확한 피부톤, 피부결을 유지
- 이 사람의 눈썹 모양, 헤어라인을 유지
- 점, 주근깨, 흉터 등 모든 특징 유지

**[작업 내용]:**
1. 원본 얼굴과 머리카락은 그대로 두고
2. 배경만 ${backgroundColor}으로 교체
3. 의상만 ${outfitDesc}으로 교체
4. 증명사진용 스튜디오 조명 적용 (얼굴 특징은 유지)

**[증명사진 스타일]:**
- 배경: ${backgroundColor} (순수 단색, 균일하게)
- 구도: 어깨~머리 위, 3x4 비율
- 표정: 원본과 동일하거나 자연스러운 무표정
- 조명: 부드러운 정면 조명

**[절대 금지]:**
❌ 얼굴을 다른 사람처럼 변경
❌ 눈을 크게/작게 만들기
❌ 코를 높게/낮게 만들기  
❌ 얼굴형 변경
❌ 과도한 피부 보정
❌ 새로운 얼굴 생성

원본 사진의 이 사람 얼굴을 정확히 유지한 채로 증명사진을 만들어주세요.`;

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Data,
        },
      },
      prompt,
    ]);

    const response = result.response;
    const images: string[] = [];

    // 응답에서 이미지 추출
    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if ((part as any).inlineData?.data) {
          const imageData = (part as any).inlineData.data;
          const mimeType = (part as any).inlineData.mimeType || "image/png";
          images.push(`data:${mimeType};base64,${imageData}`);
        }
      }
    }

    if (images.length === 0) {
      // 텍스트 응답만 있는 경우
      const textResponse = response.text();
      return {
        success: false,
        error: `이미지 생성에 실패했습니다. 응답: ${textResponse.substring(0, 200)}`,
      };
    }

    return {
      success: true,
      images,
    };
  } catch (error) {
    console.error("Gemini 이미지 생성 오류:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "이미지 생성 중 오류가 발생했습니다.",
    };
  }
}

// 여러 장 생성을 위한 함수
export async function generateMultipleIDPhotos(
  imageBase64: string,
  outfit: string,
  backgroundColor: string = "white",
  count: number = 4
): Promise<{ success: boolean; images?: string[]; error?: string }> {
  try {
    const allImages: string[] = [];
    const errors: string[] = [];

    // 병렬로 여러 장 생성
    const promises = Array.from({ length: count }, () =>
      generateIDPhoto(imageBase64, outfit, backgroundColor)
    );

    const results = await Promise.all(promises);

    for (const result of results) {
      if (result.success && result.images) {
        allImages.push(...result.images);
      } else if (result.error) {
        errors.push(result.error);
      }
    }

    if (allImages.length === 0) {
      return {
        success: false,
        error: errors[0] || "이미지 생성에 실패했습니다.",
      };
    }

    return {
      success: true,
      images: allImages.slice(0, count), // 요청한 수만큼만 반환
    };
  } catch (error) {
    console.error("다중 이미지 생성 오류:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "이미지 생성 중 오류가 발생했습니다.",
    };
  }
}
