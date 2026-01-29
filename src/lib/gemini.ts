import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function generateIDPhoto(
  imageBase64: string,
  outfit: string
): Promise<{ success: boolean; images?: string[]; error?: string }> {
  try {
    // Gemini 2.0 Flash 모델 사용 (이미지 생성 지원)
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

    const prompt = `이 사진의 인물을 기반으로 한국식 증명사진을 생성해주세요.

요구사항:
1. ${outfitDesc} 모습으로 변환
2. 배경은 순수한 흰색 또는 연한 파란색
3. 얼굴은 정면을 바라보고 있으며 자연스러운 미소
4. 어깨부터 머리 위까지 보이는 상반신 구도
5. 조명은 밝고 균일하게
6. 3x4 비율의 한국 여권/증명사진 스타일
7. 전문적이고 깔끔한 인상

원본 얼굴의 특징(눈, 코, 입, 얼굴형)을 최대한 유지하면서 증명사진 스타일로 변환해주세요.`;

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
  count: number = 4
): Promise<{ success: boolean; images?: string[]; error?: string }> {
  try {
    const allImages: string[] = [];
    const errors: string[] = [];

    // 병렬로 여러 장 생성
    const promises = Array.from({ length: count }, () =>
      generateIDPhoto(imageBase64, outfit)
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
