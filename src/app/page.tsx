"use client";

import { useState, useEffect } from "react";

interface GenerationResult {
  id: number;
  model: "GPT-5.2" | "Claude 4.5 Sonnet";
  content: string;
  status: "success" | "error";
  translatedContent?: string;
  isTranslating?: boolean;
}

interface FormData {
  name: string;
  position: string;
  company: string;
  experience: string;
  skills: string;
  motivation: string;
}

export default function Home() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    position: "",
    company: "",
    experience: "",
    skills: "",
    motivation: "",
  });
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  
  // 테마 상태
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  // 베리에이션 모달 상태
  const [variationModal, setVariationModal] = useState<{
    isOpen: boolean;
    originalContent: string;
    originalModel: string;
    originalIndex: number;
    results: GenerationResult[];
    isLoading: boolean;
    completedCount: number;
  }>({
    isOpen: false,
    originalContent: "",
    originalModel: "",
    originalIndex: 0,
    results: [],
    isLoading: false,
    completedCount: 0,
  });

  // 테마 적용
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
    }
  }, [isDarkMode]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // SSE 스트리밍으로 결과 받기
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResults([]);
    setCompletedCount(0);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("서버 오류");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("스트림 읽기 실패");

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              setIsLoading(false);
              continue;
            }
            try {
              const result = JSON.parse(data) as GenerationResult;
              setResults((prev) => {
                const exists = prev.find((r) => r.id === result.id);
                if (exists) return prev;
                return [...prev, result].sort((a, b) => a.id - b.id);
              });
              setCompletedCount((prev) => prev + 1);
            } catch {
              // JSON 파싱 실패 무시
            }
          }
        }
      }
    } catch (err) {
      setError("서버 연결에 실패했습니다.");
      console.error(err);
      setIsLoading(false);
    }
  };

  const handleTranslate = async (
    resultId: number,
    getContent: () => string,
    updateFn: (id: number, data: Partial<GenerationResult>) => void
  ) => {
    updateFn(resultId, { isTranslating: true });

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: getContent() }),
      });

      const data = await response.json();

      if (data.success) {
        updateFn(resultId, { translatedContent: data.translatedText, isTranslating: false });
      } else {
        alert("번역 중 오류가 발생했습니다: " + data.error);
        updateFn(resultId, { isTranslating: false });
      }
    } catch (err) {
      alert("번역 서버 연결에 실패했습니다.");
      console.error(err);
      updateFn(resultId, { isTranslating: false });
    }
  };

  // 베리에이션 생성 (SSE 스트리밍)
  const handleVariation = async (content: string, model: string, index: number) => {
    setVariationModal({
      isOpen: true,
      originalContent: content,
      originalModel: model,
      originalIndex: index,
      results: [],
      isLoading: true,
      completedCount: 0,
    });

    try {
      const response = await fetch("/api/variation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalContent: content, model }),
      });

      if (!response.ok) {
        throw new Error("서버 오류");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("스트림 읽기 실패");

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              setVariationModal((prev) => ({ ...prev, isLoading: false }));
              continue;
            }
            try {
              const result = JSON.parse(data) as GenerationResult;
              setVariationModal((prev) => {
                const exists = prev.results.find((r) => r.id === result.id);
                if (exists) return prev;
                return {
                  ...prev,
                  results: [...prev.results, result].sort((a, b) => a.id - b.id),
                  completedCount: prev.completedCount + 1,
                };
              });
            } catch {
              // JSON 파싱 실패 무시
            }
          }
        }
      }
    } catch (err) {
      alert("서버 연결에 실패했습니다.");
      console.error(err);
      setVariationModal((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("클립보드에 복사되었습니다!");
  };

  const updateResult = (id: number, data: Partial<GenerationResult>) => {
    setResults((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...data } : r))
    );
  };

  const updateVariationResult = (id: number, data: Partial<GenerationResult>) => {
    setVariationModal((prev) => ({
      ...prev,
      results: prev.results.map((r) => (r.id === id ? { ...r, ...data } : r)),
    }));
  };

  const gptResults = results.filter((r) => r.model === "GPT-5.2");
  const claudeResults = results.filter((r) => r.model === "Claude 4.5 Sonnet");

  // 결과 카드 컴포넌트
  const ResultCard = ({
    result,
    index,
    accentColor,
    isVariation = false,
    onTranslate,
    onVariation,
  }: {
    result: GenerationResult;
    index: number;
    accentColor: "emerald" | "amber";
    isVariation?: boolean;
    onTranslate: () => void;
    onVariation?: () => void;
  }) => {
    const [showTranslation, setShowTranslation] = useState(false);

    return (
      <div
        className={`section-card rounded-xl p-6 ${
          accentColor === "emerald" ? "card-gpt" : "card-claude"
        }`}
      >
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <span
            className={`text-sm font-medium ${
              accentColor === "emerald" ? "text-emerald-500" : "text-amber-500"
            }`}
          >
            {isVariation ? `베리에이션 버전 ${index + 1}` : `버전 ${index + 1}`}
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {/* 베리에이션 버튼 (원본에만 표시) */}
            {!isVariation && result.status === "success" && onVariation && (
              <button
                onClick={onVariation}
                className="text-xs px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors flex items-center gap-1"
              >
                🔄 베리에이션
              </button>
            )}
            {/* 영문화 버튼 */}
            {result.status === "success" && (
              <button
                onClick={() => {
                  if (result.translatedContent) {
                    setShowTranslation(!showTranslation);
                  } else {
                    onTranslate();
                  }
                }}
                disabled={result.isTranslating}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                  result.translatedContent
                    ? showTranslation
                      ? "bg-blue-600 hover:bg-blue-500 text-white"
                      : "bg-blue-500/20 hover:bg-blue-500/30 text-blue-400"
                    : "bg-blue-500/20 hover:bg-blue-500/30 text-blue-400"
                } ${result.isTranslating ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {result.isTranslating ? (
                  <>
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    번역 중...
                  </>
                ) : result.translatedContent ? (
                  showTranslation ? "🇰🇷 한글" : "🇺🇸 영문"
                ) : (
                  "🌐 영문화"
                )}
              </button>
            )}
            {/* 복사 버튼 */}
            <button
              onClick={() =>
                copyToClipboard(
                  showTranslation && result.translatedContent
                    ? result.translatedContent
                    : result.content
                )
              }
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                isDarkMode 
                  ? "bg-zinc-800 hover:bg-zinc-700" 
                  : "bg-gray-200 hover:bg-gray-300 text-gray-700"
              }`}
            >
              📋 복사
            </button>
          </div>
        </div>

        {/* 언어 표시 배지 */}
        {result.translatedContent && (
          <div className="mb-3">
            <span
              className={`text-xs px-2 py-1 rounded ${
                showTranslation
                  ? "bg-blue-500/20 text-blue-400"
                  : isDarkMode
                    ? "bg-zinc-700 text-zinc-400"
                    : "bg-gray-200 text-gray-600"
              }`}
            >
              {showTranslation ? "🇺🇸 English Version" : "🇰🇷 한국어 버전"}
            </span>
          </div>
        )}

        <div
          className={`text-sm leading-relaxed whitespace-pre-wrap ${
            result.status === "error"
              ? "text-red-400"
              : isDarkMode
                ? "text-zinc-300"
                : "text-gray-700"
          }`}
        >
          {showTranslation && result.translatedContent
            ? result.translatedContent
            : result.content}
        </div>
      </div>
    );
  };

  // 로딩 카드 컴포넌트
  const LoadingCard = ({ accentColor }: { accentColor: "emerald" | "amber" }) => (
    <div className={`section-card rounded-xl p-6 ${accentColor === "emerald" ? "card-gpt" : "card-claude"}`}>
      <div className={`h-4 rounded w-3/4 mb-3 ${accentColor === "emerald" ? "loading-gpt" : "loading-claude"}`}></div>
      <div className={`h-4 rounded w-full mb-3 ${accentColor === "emerald" ? "loading-gpt" : "loading-claude"}`}></div>
      <div className={`h-4 rounded w-5/6 mb-3 ${accentColor === "emerald" ? "loading-gpt" : "loading-claude"}`}></div>
      <div className={`h-4 rounded w-4/5 ${accentColor === "emerald" ? "loading-gpt" : "loading-claude"}`}></div>
    </div>
  );

  return (
    <main className="min-h-screen gradient-bg">
      {/* 헤더 */}
      <header className="header-bg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-amber-500 flex items-center justify-center">
                <span className="text-xl">✍️</span>
              </div>
              <div>
                <h1 className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                  WriteCopy
                </h1>
                <p className={`text-xs ${isDarkMode ? "text-zinc-500" : "text-gray-500"}`}>
                  AI 자기소개서 생성기
                </p>
              </div>
            </div>
            
            {/* 테마 토글 */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="theme-toggle"
              aria-label="테마 변경"
            />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* 입력 폼 */}
        <section className="mb-12">
          <div className={`section-card rounded-2xl p-8 ${isDarkMode ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-gray-200"} border`}>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <span className="text-emerald-500">01</span>
              정보 입력
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-zinc-400" : "text-gray-600"}`}>
                    이름
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="홍길동"
                    className="w-full px-4 py-3 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-zinc-400" : "text-gray-600"}`}>
                    지원 회사
                  </label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleInputChange}
                    placeholder="삼성전자"
                    className="w-full px-4 py-3 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-zinc-400" : "text-gray-600"}`}>
                    지원 직무
                  </label>
                  <input
                    type="text"
                    name="position"
                    value={formData.position}
                    onChange={handleInputChange}
                    placeholder="프론트엔드 개발자"
                    className="w-full px-4 py-3 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-zinc-400" : "text-gray-600"}`}>
                  경력 및 경험
                </label>
                <textarea
                  name="experience"
                  value={formData.experience}
                  onChange={handleInputChange}
                  placeholder="주요 경력, 프로젝트 경험, 인턴 경험 등을 자세히 적어주세요..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg resize-none"
                  required
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-zinc-400" : "text-gray-600"}`}>
                  보유 기술/역량
                </label>
                <textarea
                  name="skills"
                  value={formData.skills}
                  onChange={handleInputChange}
                  placeholder="기술 스택, 자격증, 언어 능력, 소프트 스킬 등..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg resize-none"
                  required
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-zinc-400" : "text-gray-600"}`}>
                  지원 동기
                </label>
                <textarea
                  name="motivation"
                  value={formData.motivation}
                  onChange={handleInputChange}
                  placeholder="왜 이 회사, 이 직무에 지원하는지 간단히 적어주세요..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 rounded-xl btn-primary text-white font-semibold text-lg flex items-center justify-center gap-3"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    생성 중... ({completedCount}/6)
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    자기소개서 6개 생성하기
                  </>
                )}
              </button>
            </form>
          </div>
        </section>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
            ⚠️ {error}
          </div>
        )}

        {/* 결과 표시 */}
        {(results.length > 0 || isLoading) && (
          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <span className="text-emerald-500">02</span>
              생성된 자기소개서
              <span className={`text-sm font-normal ml-2 ${isDarkMode ? "text-zinc-500" : "text-gray-500"}`}>
                ({completedCount}/6개 완료)
              </span>
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* GPT 결과 */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                  GPT-5.2
                  <span className={`text-xs font-normal ${isDarkMode ? "text-zinc-500" : "text-gray-500"}`}>
                    ({gptResults.length}/3개)
                  </span>
                </h3>
                <div className="space-y-4">
                  {gptResults.map((result, index) => (
                    <ResultCard
                      key={result.id}
                      result={result}
                      index={index}
                      accentColor="emerald"
                      onTranslate={() => handleTranslate(result.id, () => result.content, updateResult)}
                      onVariation={() => handleVariation(result.content, result.model, index)}
                    />
                  ))}
                  {/* 로딩 중인 카드 표시 */}
                  {isLoading && gptResults.length < 3 && 
                    Array.from({ length: 3 - gptResults.length }).map((_, i) => (
                      <LoadingCard key={`loading-gpt-${i}`} accentColor="emerald" />
                    ))
                  }
                </div>
              </div>

              {/* Claude 결과 */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                  Claude 4.5 Sonnet
                  <span className={`text-xs font-normal ${isDarkMode ? "text-zinc-500" : "text-gray-500"}`}>
                    ({claudeResults.length}/3개)
                  </span>
                </h3>
                <div className="space-y-4">
                  {claudeResults.map((result, index) => (
                    <ResultCard
                      key={result.id}
                      result={result}
                      index={index}
                      accentColor="amber"
                      onTranslate={() => handleTranslate(result.id, () => result.content, updateResult)}
                      onVariation={() => handleVariation(result.content, result.model, index)}
                    />
                  ))}
                  {/* 로딩 중인 카드 표시 */}
                  {isLoading && claudeResults.length < 3 && 
                    Array.from({ length: 3 - claudeResults.length }).map((_, i) => (
                      <LoadingCard key={`loading-claude-${i}`} accentColor="amber" />
                    ))
                  }
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* 베리에이션 모달 - 전체 화면 */}
      {variationModal.isOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: isDarkMode ? "rgba(0,0,0,0.9)" : "rgba(0,0,0,0.7)" }}
        >
          <div 
            className={`w-full h-full max-w-[95vw] max-h-[95vh] rounded-2xl overflow-hidden flex flex-col ${
              isDarkMode ? "bg-zinc-900 border-zinc-700" : "bg-white border-gray-300"
            } border`}
          >
            {/* 모달 헤더 */}
            <div className={`flex items-center justify-between p-6 border-b ${isDarkMode ? "border-zinc-700" : "border-gray-200"}`}>
              <div>
                <h3 className="text-2xl font-bold flex items-center gap-3">
                  🔄 베리에이션
                  <span className={`text-base font-normal px-3 py-1 rounded-full ${
                    variationModal.originalModel === "GPT-5.2" 
                      ? "bg-emerald-500/20 text-emerald-400" 
                      : "bg-amber-500/20 text-amber-400"
                  }`}>
                    {variationModal.originalModel}
                  </span>
                </h3>
                <p className={`text-sm mt-1 ${isDarkMode ? "text-zinc-500" : "text-gray-500"}`}>
                  원본 버전 {variationModal.originalIndex + 1}의 베리에이션 ({variationModal.completedCount}/6개 완료)
                </p>
              </div>
              <button
                onClick={() => setVariationModal((prev) => ({ ...prev, isOpen: false }))}
                className={`p-3 rounded-xl transition-colors text-xl ${
                  isDarkMode ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-gray-200 text-gray-500"
                }`}
              >
                ✕
              </button>
            </div>

            {/* 모달 컨텐츠 */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {variationModal.results.map((result, index) => (
                  <ResultCard
                    key={result.id}
                    result={result}
                    index={index}
                    accentColor={variationModal.originalModel === "GPT-5.2" ? "emerald" : "amber"}
                    isVariation={true}
                    onTranslate={() => handleTranslate(result.id, () => result.content, updateVariationResult)}
                  />
                ))}
                {/* 로딩 중인 카드 */}
                {variationModal.isLoading && variationModal.results.length < 6 &&
                  Array.from({ length: 6 - variationModal.results.length }).map((_, i) => (
                    <LoadingCard 
                      key={`loading-var-${i}`} 
                      accentColor={variationModal.originalModel === "GPT-5.2" ? "emerald" : "amber"} 
                    />
                  ))
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 푸터 */}
      <footer className={`border-t mt-16 ${isDarkMode ? "border-zinc-800" : "border-gray-200"}`}>
        <div className={`max-w-7xl mx-auto px-6 py-8 text-center text-sm ${isDarkMode ? "text-zinc-500" : "text-gray-500"}`}>
          <p>
            Powered by <span className="text-emerald-500">GPT-5.2</span> &{" "}
            <span className="text-amber-500">Claude 4.5 Sonnet</span>
          </p>
          <p className="mt-1">© 2026 WriteCopy. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
