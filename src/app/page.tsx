"use client";

import { useState } from "react";

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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setResults(data.results);
      } else {
        setError(data.error || "생성 중 오류가 발생했습니다.");
      }
    } catch (err) {
      setError("서버 연결에 실패했습니다.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTranslate = async (resultId: number) => {
    const targetResult = results.find((r) => r.id === resultId);
    if (!targetResult || targetResult.translatedContent) return;

    // 번역 중 상태로 변경
    setResults((prev) =>
      prev.map((r) =>
        r.id === resultId ? { ...r, isTranslating: true } : r
      )
    );

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: targetResult.content }),
      });

      const data = await response.json();

      if (data.success) {
        setResults((prev) =>
          prev.map((r) =>
            r.id === resultId
              ? { ...r, translatedContent: data.translatedText, isTranslating: false }
              : r
          )
        );
      } else {
        alert("번역 중 오류가 발생했습니다: " + data.error);
        setResults((prev) =>
          prev.map((r) =>
            r.id === resultId ? { ...r, isTranslating: false } : r
          )
        );
      }
    } catch (err) {
      alert("번역 서버 연결에 실패했습니다.");
      console.error(err);
      setResults((prev) =>
        prev.map((r) =>
          r.id === resultId ? { ...r, isTranslating: false } : r
        )
      );
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("클립보드에 복사되었습니다!");
  };

  const gptResults = results.filter((r) => r.model === "GPT-5.2");
  const claudeResults = results.filter((r) => r.model === "Claude 4.5 Sonnet");

  // 결과 카드 컴포넌트
  const ResultCard = ({
    result,
    index,
    accentColor,
  }: {
    result: GenerationResult;
    index: number;
    accentColor: "emerald" | "amber";
  }) => {
    const [showTranslation, setShowTranslation] = useState(false);

    return (
      <div
        className={`bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 ${
          accentColor === "emerald" ? "card-gpt" : "card-claude"
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <span
            className={`text-sm font-medium ${
              accentColor === "emerald" ? "text-emerald-400" : "text-amber-400"
            }`}
          >
            버전 {index + 1}
          </span>
          <div className="flex items-center gap-2">
            {/* 영문화 버튼 */}
            {result.status === "success" && (
              <button
                onClick={() => {
                  if (result.translatedContent) {
                    setShowTranslation(!showTranslation);
                  } else {
                    handleTranslate(result.id);
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
                    <svg
                      className="animate-spin h-3 w-3"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    번역 중...
                  </>
                ) : result.translatedContent ? (
                  showTranslation ? (
                    "🇰🇷 한글 보기"
                  ) : (
                    "🇺🇸 영문 보기"
                  )
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
              className="text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors flex items-center gap-1"
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
                  : "bg-zinc-700 text-zinc-400"
              }`}
            >
              {showTranslation ? "🇺🇸 English Version" : "🇰🇷 한국어 버전"}
            </span>
          </div>
        )}

        <div
          className={`text-sm leading-relaxed whitespace-pre-wrap ${
            result.status === "error" ? "text-red-400" : "text-zinc-300"
          }`}
        >
          {showTranslation && result.translatedContent
            ? result.translatedContent
            : result.content}
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen gradient-bg">
      {/* 헤더 */}
      <header className="border-b border-zinc-800 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-amber-500 flex items-center justify-center">
              <span className="text-xl">✍️</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">WriteCopy</h1>
              <p className="text-xs text-zinc-500">AI 자기소개서 생성기</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* 입력 폼 */}
        <section className="mb-12">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <span className="text-emerald-500">01</span>
              정보 입력
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">
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
                  <label className="block text-sm font-medium text-zinc-400 mb-2">
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
                  <label className="block text-sm font-medium text-zinc-400 mb-2">
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
                <label className="block text-sm font-medium text-zinc-400 mb-2">
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
                <label className="block text-sm font-medium text-zinc-400 mb-2">
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
                <label className="block text-sm font-medium text-zinc-400 mb-2">
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
                    <svg
                      className="animate-spin h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    AI가 자기소개서를 작성 중입니다...
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

        {/* 로딩 상태 */}
        {isLoading && (
          <section className="mb-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* GPT 로딩 */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                  GPT-5.2 생성 중...
                </h3>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 card-gpt"
                    >
                      <div className="h-4 loading-gpt rounded w-3/4 mb-3"></div>
                      <div className="h-4 loading-gpt rounded w-full mb-3"></div>
                      <div className="h-4 loading-gpt rounded w-5/6"></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Claude 로딩 */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                  Claude 4.5 Sonnet 생성 중...
                </h3>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 card-claude"
                    >
                      <div className="h-4 loading-claude rounded w-3/4 mb-3"></div>
                      <div className="h-4 loading-claude rounded w-full mb-3"></div>
                      <div className="h-4 loading-claude rounded w-5/6"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 결과 표시 */}
        {results.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <span className="text-emerald-500">02</span>
              생성된 자기소개서
              <span className="text-sm font-normal text-zinc-500 ml-2">
                (총 {results.length}개)
              </span>
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* GPT 결과 */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                  GPT-5.2
                  <span className="text-xs text-zinc-500 font-normal">
                    ({gptResults.length}개)
                  </span>
                </h3>
                <div className="space-y-4">
                  {gptResults.map((result, index) => (
                    <ResultCard
                      key={result.id}
                      result={result}
                      index={index}
                      accentColor="emerald"
                    />
                  ))}
                </div>
              </div>

              {/* Claude 결과 */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                  Claude 4.5 Sonnet
                  <span className="text-xs text-zinc-500 font-normal">
                    ({claudeResults.length}개)
                  </span>
                </h3>
                <div className="space-y-4">
                  {claudeResults.map((result, index) => (
                    <ResultCard
                      key={result.id}
                      result={result}
                      index={index}
                      accentColor="amber"
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* 푸터 */}
      <footer className="border-t border-zinc-800 mt-16">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-zinc-500 text-sm">
          <p>
            Powered by <span className="text-emerald-400">GPT-5.2</span> &{" "}
            <span className="text-amber-400">Claude 4.5 Sonnet</span>
          </p>
          <p className="mt-1">© 2026 WriteCopy. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
