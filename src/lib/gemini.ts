import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function generateIDPhoto(
  imageBase64: string,
  outfit: string,
  backgroundColor: string = "white"
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

**[중요] 얼굴 특징 100% 유지 필수:**
- 눈의 모양, 크기, 쌍꺼풀 유무를 절대 변경하지 마세요
- 코의 모양, 크기, 콧대를 절대 변경하지 마세요
- 입술 모양, 두께를 절대 변경하지 마세요
- 얼굴형(턱선, 광대뼈, 이마)을 절대 변경하지 마세요
- 피부톤, 점, 주근깨 등 피부 특징을 유지하세요
- 원본 사진의 얼굴을 그대로 사용하고, 조명/배경/의상만 변경하세요

**[허용되는 변경사항]:**
- 조명 방향과 밝기 조절 (증명사진 스튜디오 조명처럼)
- 배경 변경
- 의상 변경: ${outfitDesc}
- 약간의 피부 보정 (자연스러운 정도만)

**[스타일 요구사항]:**
1. 배경색: ${backgroundColor} (단색, 그라데이션 없이 균일하게)
2. 정면을 바라보는 자연스러운 표정
3. 어깨부터 머리 위까지 보이는 상반신 구도
4. 3x4 비율의 한국 여권/증명사진 스타일
5. 전문 스튜디오에서 찍은 것처럼 자연스럽게
6. AI가 생성한 티가 나지 않도록 사실적으로

**[금지사항]:**
- 얼굴 성형 효과 절대 금지
- 눈 크기 변경 금지
- 코 높이/모양 변경 금지
- 피부를 과하게 보정하여 플라스틱처럼 보이게 하는 것 금지
- 얼굴 비율 변경 금지`;

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
