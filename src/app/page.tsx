"use client";

import { useState, useEffect, useRef } from "react";

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

// 프리셋 데이터
const EXPERIENCE_PRESETS = [
  { label: "🎓 신입 (인턴 경험)", value: "대학교 재학 중 6개월간 스타트업에서 인턴으로 근무하며 실무 경험을 쌓았습니다. 팀 프로젝트에서 주도적으로 역할을 수행하며 협업 능력을 키웠고, 졸업 프로젝트에서 우수상을 수상한 경험이 있습니다." },
  { label: "💼 경력 1-3년", value: "현재 IT 기업에서 2년간 근무하며 다양한 프로젝트를 수행했습니다. 고객사 요구사항 분석부터 개발, 테스트, 배포까지 전 과정에 참여했으며, 팀 내 핵심 인력으로 성장했습니다. 연간 성과 평가에서 상위 10%를 기록했습니다." },
  { label: "🚀 경력 3-5년", value: "5년간 대기업과 스타트업에서 다양한 경험을 쌓았습니다. 팀 리더로서 5명의 팀원을 관리하며 프로젝트를 성공적으로 이끌었고, 신규 서비스 런칭에 핵심 역할을 담당했습니다. 매출 30% 증가에 기여한 프로젝트를 주도했습니다." },
  { label: "👔 경력 5년+", value: "10년 이상의 경력을 보유한 시니어 전문가입니다. 여러 기업에서 팀장 및 파트장으로 근무하며 조직 관리와 전략 수립 경험이 풍부합니다. 업계 트렌드를 선도하는 프로젝트를 다수 성공시켰으며, 후배 양성에도 힘쓰고 있습니다." },
  { label: "🔄 이직/전직", value: "이전 직장에서 3년간 다른 분야에서 근무했으나, 해당 분야에 대한 깊은 관심과 자기계발을 통해 전문성을 갖추었습니다. 부트캠프 수료 및 개인 프로젝트를 통해 실무 역량을 쌓았으며, 새로운 도전을 위해 지원합니다." },
];

const SKILL_PRESETS = [
  // 개발
  { label: "JavaScript", category: "개발" },
  { label: "TypeScript", category: "개발" },
  { label: "Python", category: "개발" },
  { label: "Java", category: "개발" },
  { label: "React", category: "개발" },
  { label: "Node.js", category: "개발" },
  { label: "SQL", category: "개발" },
  { label: "AWS", category: "개발" },
  // 디자인
  { label: "Figma", category: "디자인" },
  { label: "Photoshop", category: "디자인" },
  { label: "Illustrator", category: "디자인" },
  { label: "UI/UX", category: "디자인" },
  // 비즈니스
  { label: "Excel", category: "비즈니스" },
  { label: "PPT", category: "비즈니스" },
  { label: "데이터분석", category: "비즈니스" },
  { label: "기획", category: "비즈니스" },
  { label: "마케팅", category: "비즈니스" },
  { label: "영업", category: "비즈니스" },
  // 언어
  { label: "영어 (비즈니스)", category: "언어" },
  { label: "영어 (원어민)", category: "언어" },
  { label: "일본어", category: "언어" },
  { label: "중국어", category: "언어" },
  // 자격증
  { label: "정보처리기사", category: "자격증" },
  { label: "SQLD", category: "자격증" },
  { label: "컴활 1급", category: "자격증" },
  { label: "TOEIC 900+", category: "자격증" },
  // 소프트스킬
  { label: "리더십", category: "소프트스킬" },
  { label: "커뮤니케이션", category: "소프트스킬" },
  { label: "문제해결", category: "소프트스킬" },
  { label: "팀워크", category: "소프트스킬" },
];

const MOTIVATION_PRESETS = [
  { label: "🏢 회사 비전 공감", value: "귀사의 '혁신을 통한 고객 가치 창출'이라는 비전에 깊이 공감합니다. 특히 최근 귀사가 추진하는 디지털 전환 프로젝트와 ESG 경영 방침을 보며, 제가 성장하고 기여할 수 있는 최적의 환경이라고 확신했습니다." },
  { label: "🎯 직무 전문성 성장", value: "해당 직무에서 전문성을 깊이 있게 쌓고 싶습니다. 귀사는 업계 선두 기업으로서 최신 기술과 방법론을 적극 도입하고 있어, 제가 원하는 커리어 성장을 이룰 수 있는 최고의 환경이라고 생각합니다." },
  { label: "🌟 제품/서비스 팬", value: "오랫동안 귀사의 제품/서비스를 사용해온 충성 고객으로서, 이제는 만드는 사람이 되고 싶습니다. 사용자 관점에서의 인사이트와 열정을 바탕으로 더 나은 서비스를 만드는 데 기여하고 싶습니다." },
  { label: "🤝 기업문화 매력", value: "귀사의 수평적 조직문화와 자율적인 업무 환경에 큰 매력을 느꼈습니다. 구성원의 성장을 지원하고 도전을 장려하는 문화 속에서 최고의 성과를 낼 자신이 있습니다." },
  { label: "🚀 성장 가능성", value: "귀사는 빠르게 성장하는 기업으로서 다양한 기회가 열려 있습니다. 회사와 함께 성장하며 핵심 인재로 자리잡고 싶습니다. 도전적인 환경에서 제 역량을 최대한 발휘하겠습니다." },
];

const OUTFIT_OPTIONS = [
  { id: "suit_black", label: "검정 정장", emoji: "🖤" },
  { id: "suit_navy", label: "네이비 정장", emoji: "💙" },
  { id: "suit_gray", label: "그레이 정장", emoji: "🩶" },
  { id: "shirt_white", label: "흰 셔츠", emoji: "🤍" },
  { id: "blouse", label: "블라우스", emoji: "👚" },
  { id: "casual", label: "비즈니스 캐주얼", emoji: "👔" },
];

export default function Home() {
  const [currentPage, setCurrentPage] = useState<"cover-letter" | "id-photo">("cover-letter");
  const [formData, setFormData] = useState<FormData>({
    name: "",
    position: "",
    company: "",
    experience: "",
    skills: "",
    motivation: "",
  });
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  
  // 테마 상태
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  // AI 민증사진 상태
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedOutfit, setSelectedOutfit] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

  // 스킬 선택 시 formData 업데이트
  useEffect(() => {
    const skillText = selectedSkills.join(", ");
    const customSkills = formData.skills.split(", ").filter(s => !SKILL_PRESETS.some(p => p.label === s.trim()));
    const combined = [...selectedSkills, ...customSkills.filter(s => s.trim())].join(", ");
    if (combined !== formData.skills) {
      setFormData(prev => ({ ...prev, skills: combined }));
    }
  }, [selectedSkills]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill) 
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  const applyPreset = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

      if (!response.ok) throw new Error("서버 오류");

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
            } catch { /* ignore */ }
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

      if (!response.ok) throw new Error("서버 오류");

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
            } catch { /* ignore */ }
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
    setResults((prev) => prev.map((r) => (r.id === id ? { ...r, ...data } : r)));
  };

  const updateVariationResult = (id: number, data: Partial<GenerationResult>) => {
    setVariationModal((prev) => ({
      ...prev,
      results: prev.results.map((r) => (r.id === id ? { ...r, ...data } : r)),
    }));
  };

  // 이미지 업로드 핸들러
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
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
      <div className={`section-card rounded-xl p-6 ${accentColor === "emerald" ? "card-gpt" : "card-claude"}`}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <span className={`text-sm font-medium ${accentColor === "emerald" ? "text-emerald-500" : "text-amber-500"}`}>
            {isVariation ? `베리에이션 버전 ${index + 1}` : `버전 ${index + 1}`}
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {!isVariation && result.status === "success" && onVariation && (
              <button onClick={onVariation} className="text-xs px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors">
                🔄 베리에이션
              </button>
            )}
            {result.status === "success" && (
              <button
                onClick={() => result.translatedContent ? setShowTranslation(!showTranslation) : onTranslate()}
                disabled={result.isTranslating}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                  result.translatedContent
                    ? showTranslation ? "bg-blue-600 text-white" : "bg-blue-500/20 text-blue-400"
                    : "bg-blue-500/20 text-blue-400"
                } ${result.isTranslating ? "opacity-50" : ""}`}
              >
                {result.isTranslating ? "번역 중..." : result.translatedContent ? (showTranslation ? "🇰🇷 한글" : "🇺🇸 영문") : "🌐 영문화"}
              </button>
            )}
            <button
              onClick={() => copyToClipboard(showTranslation && result.translatedContent ? result.translatedContent : result.content)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${isDarkMode ? "bg-zinc-800 hover:bg-zinc-700" : "bg-gray-200 hover:bg-gray-300 text-gray-700"}`}
            >
              📋 복사
            </button>
          </div>
        </div>
        {result.translatedContent && (
          <div className="mb-3">
            <span className={`text-xs px-2 py-1 rounded ${showTranslation ? "bg-blue-500/20 text-blue-400" : isDarkMode ? "bg-zinc-700 text-zinc-400" : "bg-gray-200 text-gray-600"}`}>
              {showTranslation ? "🇺🇸 English" : "🇰🇷 한국어"}
            </span>
          </div>
        )}
        <div className={`text-sm leading-relaxed whitespace-pre-wrap ${result.status === "error" ? "text-red-400" : isDarkMode ? "text-zinc-300" : "text-gray-700"}`}>
          {showTranslation && result.translatedContent ? result.translatedContent : result.content}
        </div>
      </div>
    );
  };

  const LoadingCard = ({ accentColor }: { accentColor: "emerald" | "amber" }) => (
    <div className={`section-card rounded-xl p-6 ${accentColor === "emerald" ? "card-gpt" : "card-claude"}`}>
      <div className={`h-4 rounded w-3/4 mb-3 ${accentColor === "emerald" ? "loading-gpt" : "loading-claude"}`}></div>
      <div className={`h-4 rounded w-full mb-3 ${accentColor === "emerald" ? "loading-gpt" : "loading-claude"}`}></div>
      <div className={`h-4 rounded w-5/6 ${accentColor === "emerald" ? "loading-gpt" : "loading-claude"}`}></div>
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
                <h1 className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>WriteCopy</h1>
                <p className={`text-xs ${isDarkMode ? "text-zinc-500" : "text-gray-500"}`}>AI 자기소개서 생성기</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* 페이지 네비게이션 */}
              <div className={`flex rounded-xl p-1 ${isDarkMode ? "bg-zinc-800" : "bg-gray-200"}`}>
                <button
                  onClick={() => setCurrentPage("cover-letter")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === "cover-letter"
                      ? "bg-emerald-500 text-white"
                      : isDarkMode ? "text-zinc-400 hover:text-white" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  ✍️ 자기소개서
                </button>
                <button
                  onClick={() => setCurrentPage("id-photo")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === "id-photo"
                      ? "bg-emerald-500 text-white"
                      : isDarkMode ? "text-zinc-400 hover:text-white" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  📸 AI 민증사진
                </button>
              </div>
              
              {/* 테마 토글 */}
              <button onClick={() => setIsDarkMode(!isDarkMode)} className="theme-toggle" aria-label="테마 변경" />
            </div>
          </div>
        </div>
      </header>

      {/* 자기소개서 페이지 */}
      {currentPage === "cover-letter" && (
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
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-zinc-400" : "text-gray-600"}`}>이름</label>
                    <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="홍길동" className="w-full px-4 py-3 rounded-lg" required />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-zinc-400" : "text-gray-600"}`}>지원 회사</label>
                    <input type="text" name="company" value={formData.company} onChange={handleInputChange} placeholder="삼성전자" className="w-full px-4 py-3 rounded-lg" required />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-zinc-400" : "text-gray-600"}`}>지원 직무</label>
                    <input type="text" name="position" value={formData.position} onChange={handleInputChange} placeholder="프론트엔드 개발자" className="w-full px-4 py-3 rounded-lg" required />
                  </div>
                </div>

                {/* 경력 및 경험 */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-zinc-400" : "text-gray-600"}`}>경력 및 경험</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {EXPERIENCE_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => applyPreset("experience", preset.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          formData.experience === preset.value
                            ? "bg-emerald-500 text-white"
                            : isDarkMode
                              ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
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

                {/* 보유 기술 */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-zinc-400" : "text-gray-600"}`}>보유 기술/역량</label>
                  <div className="space-y-3 mb-3">
                    {["개발", "디자인", "비즈니스", "언어", "자격증", "소프트스킬"].map((category) => (
                      <div key={category}>
                        <span className={`text-xs font-medium ${isDarkMode ? "text-zinc-500" : "text-gray-500"}`}>{category}</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {SKILL_PRESETS.filter(s => s.category === category).map((skill) => (
                            <button
                              key={skill.label}
                              type="button"
                              onClick={() => toggleSkill(skill.label)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                selectedSkills.includes(skill.label)
                                  ? "bg-emerald-500 text-white"
                                  : isDarkMode
                                    ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                              }`}
                            >
                              {skill.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <textarea
                    name="skills"
                    value={formData.skills}
                    onChange={handleInputChange}
                    placeholder="추가 기술이나 역량을 직접 입력하세요..."
                    rows={2}
                    className="w-full px-4 py-3 rounded-lg resize-none"
                  />
                </div>

                {/* 지원 동기 */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-zinc-400" : "text-gray-600"}`}>지원 동기</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {MOTIVATION_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => applyPreset("motivation", preset.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          formData.motivation === preset.value
                            ? "bg-emerald-500 text-white"
                            : isDarkMode
                              ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <textarea
                    name="motivation"
                    value={formData.motivation}
                    onChange={handleInputChange}
                    placeholder="왜 이 회사, 이 직무에 지원하는지 적어주세요..."
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
                    <>🚀 자기소개서 6개 생성하기</>
                  )}
                </button>
              </form>
            </div>
          </section>

          {error && (
            <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">⚠️ {error}</div>
          )}

          {(results.length > 0 || isLoading) && (
            <section>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <span className="text-emerald-500">02</span>
                생성된 자기소개서
                <span className={`text-sm font-normal ml-2 ${isDarkMode ? "text-zinc-500" : "text-gray-500"}`}>({completedCount}/6개 완료)</span>
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                    GPT-5.2 <span className={`text-xs font-normal ${isDarkMode ? "text-zinc-500" : "text-gray-500"}`}>({gptResults.length}/3개)</span>
                  </h3>
                  <div className="space-y-4">
                    {gptResults.map((result, index) => (
                      <ResultCard key={result.id} result={result} index={index} accentColor="emerald"
                        onTranslate={() => handleTranslate(result.id, () => result.content, updateResult)}
                        onVariation={() => handleVariation(result.content, result.model, index)} />
                    ))}
                    {isLoading && gptResults.length < 3 && Array.from({ length: 3 - gptResults.length }).map((_, i) => <LoadingCard key={`lg-${i}`} accentColor="emerald" />)}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                    Claude 4.5 Sonnet <span className={`text-xs font-normal ${isDarkMode ? "text-zinc-500" : "text-gray-500"}`}>({claudeResults.length}/3개)</span>
                  </h3>
                  <div className="space-y-4">
                    {claudeResults.map((result, index) => (
                      <ResultCard key={result.id} result={result} index={index} accentColor="amber"
                        onTranslate={() => handleTranslate(result.id, () => result.content, updateResult)}
                        onVariation={() => handleVariation(result.content, result.model, index)} />
                    ))}
                    {isLoading && claudeResults.length < 3 && Array.from({ length: 3 - claudeResults.length }).map((_, i) => <LoadingCard key={`lc-${i}`} accentColor="amber" />)}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {/* AI 민증사진 페이지 */}
      {currentPage === "id-photo" && (
        <div className="max-w-4xl mx-auto px-6 py-8">
          <section>
            <div className={`section-card rounded-2xl p-8 ${isDarkMode ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-gray-200"} border`}>
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <span className="text-emerald-500">📸</span>
                AI 민증사진 생성
              </h2>
              <p className={`text-sm mb-8 ${isDarkMode ? "text-zinc-500" : "text-gray-500"}`}>
                얼굴 사진을 업로드하고 원하는 의상을 선택하면 AI가 전문적인 증명사진을 만들어드려요
              </p>

              {/* 사진 업로드 영역 */}
              <div className="mb-8">
                <label className={`block text-sm font-medium mb-3 ${isDarkMode ? "text-zinc-400" : "text-gray-600"}`}>
                  1. 얼굴 사진 업로드
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                    uploadedImage
                      ? "border-emerald-500"
                      : isDarkMode
                        ? "border-zinc-700 hover:border-zinc-600"
                        : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  {uploadedImage ? (
                    <div className="flex flex-col items-center">
                      <img src={uploadedImage} alt="Uploaded" className="w-40 h-40 object-cover rounded-xl mb-4" />
                      <p className={`text-sm ${isDarkMode ? "text-zinc-400" : "text-gray-500"}`}>클릭하여 다른 사진으로 변경</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${isDarkMode ? "bg-zinc-800" : "bg-gray-200"}`}>
                        <span className="text-4xl">🤳</span>
                      </div>
                      <p className={`font-medium mb-1 ${isDarkMode ? "text-zinc-300" : "text-gray-700"}`}>클릭하여 사진 업로드</p>
                      <p className={`text-sm ${isDarkMode ? "text-zinc-500" : "text-gray-500"}`}>JPG, PNG 파일 지원</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* 의상 선택 */}
              <div className="mb-8">
                <label className={`block text-sm font-medium mb-3 ${isDarkMode ? "text-zinc-400" : "text-gray-600"}`}>
                  2. 의상 선택
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {OUTFIT_OPTIONS.map((outfit) => (
                    <button
                      key={outfit.id}
                      type="button"
                      onClick={() => setSelectedOutfit(outfit.id)}
                      className={`p-4 rounded-xl text-center transition-all ${
                        selectedOutfit === outfit.id
                          ? "bg-emerald-500 text-white ring-2 ring-emerald-400 ring-offset-2 ring-offset-transparent"
                          : isDarkMode
                            ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      <span className="text-2xl mb-2 block">{outfit.emoji}</span>
                      <span className="text-sm font-medium">{outfit.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 생성 버튼 */}
              <button
                disabled={!uploadedImage || !selectedOutfit}
                className={`w-full py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-3 transition-all ${
                  uploadedImage && selectedOutfit
                    ? "btn-primary text-white"
                    : isDarkMode
                      ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                ✨ AI 증명사진 생성하기
              </button>

              {/* 안내 문구 */}
              {(!uploadedImage || !selectedOutfit) && (
                <p className={`text-center text-sm mt-4 ${isDarkMode ? "text-zinc-500" : "text-gray-500"}`}>
                  {!uploadedImage && !selectedOutfit
                    ? "사진을 업로드하고 의상을 선택해주세요"
                    : !uploadedImage
                      ? "사진을 업로드해주세요"
                      : "의상을 선택해주세요"}
                </p>
              )}

              {/* 결과 영역 (추후 구현) */}
              <div className={`mt-8 p-6 rounded-xl border-2 border-dashed ${isDarkMode ? "border-zinc-800" : "border-gray-200"}`}>
                <p className={`text-center ${isDarkMode ? "text-zinc-600" : "text-gray-400"}`}>
                  🖼️ 생성된 증명사진이 여기에 표시됩니다 (4장)
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`aspect-[3/4] rounded-lg ${isDarkMode ? "bg-zinc-800" : "bg-gray-100"}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* 베리에이션 모달 */}
      {variationModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: isDarkMode ? "rgba(0,0,0,0.9)" : "rgba(0,0,0,0.7)" }}>
          <div className={`w-full h-full max-w-[95vw] max-h-[95vh] rounded-2xl overflow-hidden flex flex-col ${isDarkMode ? "bg-zinc-900 border-zinc-700" : "bg-white border-gray-300"} border`}>
            <div className={`flex items-center justify-between p-6 border-b ${isDarkMode ? "border-zinc-700" : "border-gray-200"}`}>
              <div>
                <h3 className="text-2xl font-bold flex items-center gap-3">
                  🔄 베리에이션
                  <span className={`text-base font-normal px-3 py-1 rounded-full ${variationModal.originalModel === "GPT-5.2" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                    {variationModal.originalModel}
                  </span>
                </h3>
                <p className={`text-sm mt-1 ${isDarkMode ? "text-zinc-500" : "text-gray-500"}`}>
                  원본 버전 {variationModal.originalIndex + 1}의 베리에이션 ({variationModal.completedCount}/6개 완료)
                </p>
              </div>
              <button onClick={() => setVariationModal((prev) => ({ ...prev, isOpen: false }))} className={`p-3 rounded-xl text-xl ${isDarkMode ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-gray-200 text-gray-500"}`}>✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {variationModal.results.map((result, index) => (
                  <ResultCard key={result.id} result={result} index={index} accentColor={variationModal.originalModel === "GPT-5.2" ? "emerald" : "amber"} isVariation={true}
                    onTranslate={() => handleTranslate(result.id, () => result.content, updateVariationResult)} />
                ))}
                {variationModal.isLoading && variationModal.results.length < 6 &&
                  Array.from({ length: 6 - variationModal.results.length }).map((_, i) => (
                    <LoadingCard key={`lv-${i}`} accentColor={variationModal.originalModel === "GPT-5.2" ? "emerald" : "amber"} />
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 푸터 */}
      <footer className={`border-t mt-16 ${isDarkMode ? "border-zinc-800" : "border-gray-200"}`}>
        <div className={`max-w-7xl mx-auto px-6 py-8 text-center text-sm ${isDarkMode ? "text-zinc-500" : "text-gray-500"}`}>
          <p>Powered by <span className="text-emerald-500">GPT-5.2</span> & <span className="text-amber-500">Claude 4.5 Sonnet</span></p>
          <p className="mt-1">© 2026 WriteCopy. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
