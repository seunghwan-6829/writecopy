import { NextResponse } from "next/server";
import { generateMultipleIDPhotos } from "@/lib/gemini";

export async function POST(request: Request) {
  try {
    const { image, outfit, backgroundColor } = await request.json();

    if (!image) {
      return NextResponse.json(
        { success: false, error: "이미지가 필요합니다." },
        { status: 400 }
      );
    }

    if (!outfit) {
      return NextResponse.json(
        { success: false, error: "의상 선택이 필요합니다." },
        { status: 400 }
      );
    }

    // Gemini API로 증명사진 4장 생성
    const result = await generateMultipleIDPhotos(image, outfit, backgroundColor || "흰색 (white, #FFFFFF)", 4);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      images: result.images,
    });
  } catch (error) {
    console.error("ID Photo API Error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "서버 오류가 발생했습니다." 
      },
      { status: 500 }
    );
  }
}
