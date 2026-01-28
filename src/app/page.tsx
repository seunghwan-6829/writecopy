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

interface ReviewResult {
  overall_score: number;
  overall_comment: string;
  strengths: { text: string; comment: string }[];
  improvements: { original: string; suggestion: string; reason: string }[];
  additions: { where: string; content: string; reason: string }[];
  appeal_points: { text: string; how: string }[];
  warnings: { text: string; reason: string }[];
}

// 프리셋 데이터
const EXPERIENCE_PRESETS = [
  { label: "🎓 신입", value: "대학교 재학 중 6개월간 스타트업에서 인턴으로 근무하며 실무 경험을 쌓았습니다. 팀 프로젝트에서 주도적으로 역할을 수행하며 협업 능력을 키웠고, 졸업 프로젝트에서 우수상을 수상한 경험이 있습니다." },
  { label: "💼 1-3년", value: "현재 IT 기업에서 2년간 근무하며 다양한 프로젝트를 수행했습니다. 고객사 요구사항 분석부터 개발, 테스트, 배포까지 전 과정에 참여했으며, 팀 내 핵심 인력으로 성장했습니다." },
  { label: "🚀 3-5년", value: "5년간 대기업과 스타트업에서 다양한 경험을 쌓았습니다. 팀 리더로서 5명의 팀원을 관리하며 프로젝트를 성공적으로 이끌었고, 매출 30% 증가에 기여했습니다." },
  { label: "👔 5년+", value: "10년 이상의 경력을 보유한 시니어 전문가입니다. 여러 기업에서 팀장으로 근무하며 조직 관리와 전략 수립 경험이 풍부합니다." },
  { label: "🔄 이직", value: "이전 직장에서 3년간 다른 분야에서 근무했으나, 해당 분야에 대한 깊은 관심과 자기계발을 통해 전문성을 갖추었습니다. 부트캠프 수료 및 개인 프로젝트를 통해 실무 역량을 쌓았습니다." },
];

const SKILL_PRESETS = [
  { label: "JavaScript", category: "개발" }, { label: "TypeScript", category: "개발" }, { label: "Python", category: "개발" },
  { label: "Java", category: "개발" }, { label: "React", category: "개발" }, { label: "Node.js", category: "개발" },
  { label: "Figma", category: "디자인" }, { label: "Photoshop", category: "디자인" }, { label: "UI/UX", category: "디자인" },
  { label: "Excel", category: "비즈니스" }, { label: "PPT", category: "비즈니스" }, { label: "데이터분석", category: "비즈니스" }, { label: "마케팅", category: "비즈니스" },
  { label: "영어", category: "언어" }, { label: "일본어", category: "언어" }, { label: "중국어", category: "언어" },
  { label: "정보처리기사", category: "자격증" }, { label: "SQLD", category: "자격증" }, { label: "TOEIC 900+", category: "자격증" },
  { label: "리더십", category: "소프트" }, { label: "커뮤니케이션", category: "소프트" }, { label: "문제해결", category: "소프트" },
];

const MOTIVATION_PRESETS = [
  { label: "🏢 비전 공감", value: "귀사의 '혁신을 통한 고객 가치 창출'이라는 비전에 깊이 공감합니다. 특히 최근 귀사가 추진하는 디지털 전환 프로젝트를 보며, 제가 성장하고 기여할 수 있는 최적의 환경이라고 확신했습니다." },
  { label: "🎯 전문성 성장", value: "해당 직무에서 전문성을 깊이 있게 쌓고 싶습니다. 귀사는 업계 선두 기업으로서 최신 기술과 방법론을 적극 도입하고 있어, 제가 원하는 커리어 성장을 이룰 수 있는 최고의 환경입니다." },
  { label: "🌟 서비스 팬", value: "오랫동안 귀사의 제품/서비스를 사용해온 충성 고객으로서, 이제는 만드는 사람이 되고 싶습니다. 사용자 관점에서의 인사이트와 열정을 바탕으로 더 나은 서비스를 만드는 데 기여하고 싶습니다." },
  { label: "🤝 문화 매력", value: "귀사의 수평적 조직문화와 자율적인 업무 환경에 큰 매력을 느꼈습니다. 구성원의 성장을 지원하고 도전을 장려하는 문화 속에서 최고의 성과를 낼 자신이 있습니다." },
];

const OUTFIT_OPTIONS = [
  { id: "suit_black", label: "검정 정장", emoji: "🖤" }, { id: "suit_navy", label: "네이비 정장", emoji: "💙" },
  { id: "suit_gray", label: "그레이 정장", emoji: "🩶" }, { id: "shirt_white", label: "흰 셔츠", emoji: "🤍" },
  { id: "blouse", label: "블라우스", emoji: "👚" }, { id: "casual", label: "비즈캐주얼", emoji: "👔" },
];

export default function Home() {
  const [currentPage, setCurrentPage] = useState<"cover-letter" | "id-photo">("cover-letter");
  const [formData, setFormData] = useState<FormData>({ name: "", position: "", company: "", experience: "", skills: "", motivation: "" });
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedOutfit, setSelectedOutfit] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 베리에이션 모달
  const [variationModal, setVariationModal] = useState<{
    isOpen: boolean; originalContent: string; originalModel: string; originalIndex: number;
    results: GenerationResult[]; isLoading: boolean; completedCount: number;
  }>({ isOpen: false, originalContent: "", originalModel: "", originalIndex: 0, results: [], isLoading: false, completedCount: 0 });

  // 교차 검증 모달
  const [reviewModal, setReviewModal] = useState<{
    isOpen: boolean; content: string; isLoading: boolean; review: ReviewResult | null;
  }>({ isOpen: false, content: "", isLoading: false, review: null });

  useEffect(() => {
    document.documentElement.classList.toggle("light", !isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    const combined = [...selectedSkills, ...formData.skills.split(", ").filter(s => s.trim() && !SKILL_PRESETS.some(p => p.label === s.trim()))].join(", ");
    if (combined !== formData.skills) setFormData(prev => ({ ...prev, skills: combined }));
  }, [selectedSkills]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const toggleSkill = (skill: string) => setSelectedSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);
  const applyPreset = (field: keyof FormData, value: string) => setFormData(prev => ({ ...prev, [field]: value }));

  // 자기소개서 생성
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true); setError(null); setResults([]); setCompletedCount(0);
    try {
      const response = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) });
      if (!response.ok) throw new Error("서버 오류");
      const reader = response.body?.getReader();
      if (!reader) throw new Error("스트림 읽기 실패");
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n")) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") { setIsLoading(false); continue; }
            try {
              const result = JSON.parse(data) as GenerationResult;
              setResults(prev => prev.find(r => r.id === result.id) ? prev : [...prev, result].sort((a, b) => a.id - b.id));
              setCompletedCount(prev => prev + 1);
            } catch {}
          }
        }
      }
    } catch (err) { setError("서버 연결에 실패했습니다."); setIsLoading(false); }
  };

  // 번역
  const handleTranslate = async (resultId: number, getContent: () => string, updateFn: (id: number, data: Partial<GenerationResult>) => void) => {
    updateFn(resultId, { isTranslating: true });
    try {
      const res = await fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: getContent() }) });
      const data = await res.json();
      updateFn(resultId, data.success ? { translatedContent: data.translatedText, isTranslating: false } : { isTranslating: false });
      if (!data.success) alert("번역 오류: " + data.error);
    } catch { alert("번역 서버 연결 실패"); updateFn(resultId, { isTranslating: false }); }
  };

  // 베리에이션
  const handleVariation = async (content: string, model: string, index: number) => {
    setVariationModal({ isOpen: true, originalContent: content, originalModel: model, originalIndex: index, results: [], isLoading: true, completedCount: 0 });
    try {
      const response = await fetch("/api/variation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ originalContent: content, model }) });
      if (!response.ok) throw new Error("서버 오류");
      const reader = response.body?.getReader();
      if (!reader) throw new Error("스트림 읽기 실패");
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n")) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") { setVariationModal(prev => ({ ...prev, isLoading: false })); continue; }
            try {
              const result = JSON.parse(data) as GenerationResult;
              setVariationModal(prev => prev.results.find(r => r.id === result.id) ? prev : { ...prev, results: [...prev.results, result].sort((a, b) => a.id - b.id), completedCount: prev.completedCount + 1 });
            } catch {}
          }
        }
      }
    } catch { alert("서버 연결 실패"); setVariationModal(prev => ({ ...prev, isLoading: false })); }
  };

  // 교차 검증
  const handleReview = async (content: string) => {
    setReviewModal({ isOpen: true, content, isLoading: true, review: null });
    try {
      const res = await fetch("/api/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) });
      const data = await res.json();
      if (data.success) {
        setReviewModal(prev => ({ ...prev, isLoading: false, review: data.review }));
      } else {
        alert("분석 오류: " + data.error);
        setReviewModal(prev => ({ ...prev, isLoading: false }));
      }
    } catch { alert("서버 연결 실패"); setReviewModal(prev => ({ ...prev, isLoading: false })); }
  };

  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); alert("복사되었습니다!"); };
  const updateResult = (id: number, data: Partial<GenerationResult>) => setResults(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
  const updateVariationResult = (id: number, data: Partial<GenerationResult>) => setVariationModal(prev => ({ ...prev, results: prev.results.map(r => r.id === id ? { ...r, ...data } : r) }));
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { const reader = new FileReader(); reader.onloadend = () => setUploadedImage(reader.result as string); reader.readAsDataURL(file); }
  };

  const gptResults = results.filter(r => r.model === "GPT-5.2");
  const claudeResults = results.filter(r => r.model === "Claude 4.5 Sonnet");

  // 결과 카드
  const ResultCard = ({ result, index, accentColor, isVariation = false, onTranslate, onVariation, onReview }: {
    result: GenerationResult; index: number; accentColor: "emerald" | "amber"; isVariation?: boolean;
    onTranslate: () => void; onVariation?: () => void; onReview?: () => void;
  }) => {
    const [showTranslation, setShowTranslation] = useState(false);
    return (
      <div className={`section-card rounded-xl p-6 ${accentColor === "emerald" ? "card-gpt" : "card-claude"}`}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <span className={`text-sm font-medium ${accentColor === "emerald" ? "text-emerald-500" : "text-amber-500"}`}>
            {isVariation ? `베리에이션 버전 ${index + 1}` : `버전 ${index + 1}`}
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {result.status === "success" && onReview && (
              <button onClick={onReview} className="text-xs px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg transition-colors">
                🔍 교차검증
              </button>
            )}
            {!isVariation && result.status === "success" && onVariation && (
              <button onClick={onVariation} className="text-xs px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors">
                🔄 베리에이션
              </button>
            )}
            {result.status === "success" && (
              <button onClick={() => result.translatedContent ? setShowTranslation(!showTranslation) : onTranslate()}
                disabled={result.isTranslating}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${result.translatedContent ? (showTranslation ? "bg-blue-600 text-white" : "bg-blue-500/20 text-blue-400") : "bg-blue-500/20 text-blue-400"} ${result.isTranslating ? "opacity-50" : ""}`}>
                {result.isTranslating ? "번역중..." : result.translatedContent ? (showTranslation ? "🇰🇷" : "🇺🇸") : "🌐 영문화"}
              </button>
            )}
            <button onClick={() => copyToClipboard(showTranslation && result.translatedContent ? result.translatedContent : result.content)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${isDarkMode ? "bg-zinc-800 hover:bg-zinc-700" : "bg-gray-200 hover:bg-gray-300 text-gray-700"}`}>
              📋
            </button>
          </div>
        </div>
        {result.translatedContent && (
          <div className="mb-3">
            <span className={`text-xs px-2 py-1 rounded ${showTranslation ? "bg-blue-500/20 text-blue-400" : isDarkMode ? "bg-zinc-700 text-zinc-400" : "bg-gray-200 text-gray-600"}`}>
              {showTranslation ? "🇺🇸 EN" : "🇰🇷 KR"}
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
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-amber-500 flex items-center justify-center text-xl">✍️</div>
            <div>
              <h1 className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>WriteCopy</h1>
              <p className={`text-xs ${isDarkMode ? "text-zinc-500" : "text-gray-500"}`}>AI 자기소개서 생성기</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex rounded-xl p-1 ${isDarkMode ? "bg-zinc-800" : "bg-gray-200"}`}>
              <button onClick={() => setCurrentPage("cover-letter")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${currentPage === "cover-letter" ? "bg-emerald-500 text-white" : isDarkMode ? "text-zinc-400" : "text-gray-600"}`}>✍️ 자소서</button>
              <button onClick={() => setCurrentPage("id-photo")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${currentPage === "id-photo" ? "bg-emerald-500 text-white" : isDarkMode ? "text-zinc-400" : "text-gray-600"}`}>📸 민증사진</button>
            </div>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="theme-toggle" />
          </div>
        </div>
      </header>

      {/* 자기소개서 페이지 */}
      {currentPage === "cover-letter" && (
        <div className="max-w-7xl mx-auto px-6 py-8">
          <section className="mb-12">
            <div className={`section-card rounded-2xl p-8 ${isDarkMode ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-gray-200"} border`}>
              <h2 className="text-2xl font-bold mb-6"><span className="text-emerald-500">01</span> 정보 입력</h2>
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

                {/* 경력 */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-zinc-400" : "text-gray-600"}`}>경력 및 경험</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {EXPERIENCE_PRESETS.map(p => (
                      <button key={p.label} type="button" onClick={() => applyPreset("experience", p.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${formData.experience === p.value ? "bg-emerald-500 text-white" : isDarkMode ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}>{p.label}</button>
                    ))}
                  </div>
                  <textarea name="experience" value={formData.experience} onChange={handleInputChange} placeholder="경력, 프로젝트 경험 등..." rows={4} className="w-full px-4 py-3 rounded-lg resize-none" required />
                </div>

                {/* 기술 */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-zinc-400" : "text-gray-600"}`}>보유 기술/역량</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {SKILL_PRESETS.map(s => (
                      <button key={s.label} type="button" onClick={() => toggleSkill(s.label)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedSkills.includes(s.label) ? "bg-emerald-500 text-white" : isDarkMode ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}>{s.label}</button>
                    ))}
                  </div>
                  <textarea name="skills" value={formData.skills} onChange={handleInputChange} placeholder="추가 기술 직접 입력..." rows={2} className="w-full px-4 py-3 rounded-lg resize-none" />
                </div>

                {/* 지원동기 */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-zinc-400" : "text-gray-600"}`}>지원 동기</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {MOTIVATION_PRESETS.map(p => (
                      <button key={p.label} type="button" onClick={() => applyPreset("motivation", p.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${formData.motivation === p.value ? "bg-emerald-500 text-white" : isDarkMode ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}>{p.label}</button>
                    ))}
                  </div>
                  <textarea name="motivation" value={formData.motivation} onChange={handleInputChange} placeholder="지원 동기..." rows={3} className="w-full px-4 py-3 rounded-lg resize-none" required />
                </div>

                <button type="submit" disabled={isLoading} className="w-full py-4 rounded-xl btn-primary text-white font-semibold text-lg flex items-center justify-center gap-3">
                  {isLoading ? <>⏳ 생성 중... ({completedCount}/6)</> : <>🚀 자기소개서 6개 생성</>}
                </button>
              </form>
            </div>
          </section>

          {error && <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">⚠️ {error}</div>}

          {(results.length > 0 || isLoading) && (
            <section>
              <h2 className="text-2xl font-bold mb-6"><span className="text-emerald-500">02</span> 생성된 자기소개서 <span className={`text-sm font-normal ml-2 ${isDarkMode ? "text-zinc-500" : "text-gray-500"}`}>({completedCount}/6)</span></h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500"></span>GPT-5.2 ({gptResults.length}/3)</h3>
                  <div className="space-y-4">
                    {gptResults.map((r, i) => <ResultCard key={r.id} result={r} index={i} accentColor="emerald" onTranslate={() => handleTranslate(r.id, () => r.content, updateResult)} onVariation={() => handleVariation(r.content, r.model, i)} onReview={() => handleReview(r.content)} />)}
                    {isLoading && gptResults.length < 3 && Array.from({ length: 3 - gptResults.length }).map((_, i) => <LoadingCard key={`lg-${i}`} accentColor="emerald" />)}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500"></span>Claude 4.5 ({claudeResults.length}/3)</h3>
                  <div className="space-y-4">
                    {claudeResults.map((r, i) => <ResultCard key={r.id} result={r} index={i} accentColor="amber" onTranslate={() => handleTranslate(r.id, () => r.content, updateResult)} onVariation={() => handleVariation(r.content, r.model, i)} onReview={() => handleReview(r.content)} />)}
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
          <div className={`section-card rounded-2xl p-8 ${isDarkMode ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-gray-200"} border`}>
            <h2 className="text-2xl font-bold mb-2">📸 AI 민증사진 생성</h2>
            <p className={`text-sm mb-8 ${isDarkMode ? "text-zinc-500" : "text-gray-500"}`}>얼굴 사진 업로드 → 의상 선택 → AI가 증명사진 생성</p>
            
            <div className="mb-8">
              <label className={`block text-sm font-medium mb-3 ${isDarkMode ? "text-zinc-400" : "text-gray-600"}`}>1. 얼굴 사진 업로드</label>
              <div onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${uploadedImage ? "border-emerald-500" : isDarkMode ? "border-zinc-700 hover:border-zinc-600" : "border-gray-300 hover:border-gray-400"}`}>
                {uploadedImage ? <img src={uploadedImage} alt="Uploaded" className="w-40 h-40 object-cover rounded-xl mx-auto" /> : <div className="text-4xl mb-2">🤳</div>}
                <p className={`text-sm ${isDarkMode ? "text-zinc-400" : "text-gray-500"}`}>{uploadedImage ? "클릭하여 변경" : "클릭하여 업로드"}</p>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </div>
            </div>

            <div className="mb-8">
              <label className={`block text-sm font-medium mb-3 ${isDarkMode ? "text-zinc-400" : "text-gray-600"}`}>2. 의상 선택</label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {OUTFIT_OPTIONS.map(o => (
                  <button key={o.id} type="button" onClick={() => setSelectedOutfit(o.id)}
                    className={`p-4 rounded-xl text-center transition-all ${selectedOutfit === o.id ? "bg-emerald-500 text-white ring-2 ring-emerald-400" : isDarkMode ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                    <span className="text-2xl block">{o.emoji}</span>
                    <span className="text-xs">{o.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button disabled={!uploadedImage || !selectedOutfit} className={`w-full py-4 rounded-xl font-semibold text-lg ${uploadedImage && selectedOutfit ? "btn-primary text-white" : isDarkMode ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>
              ✨ AI 증명사진 생성하기
            </button>

            <div className={`mt-8 p-6 rounded-xl border-2 border-dashed ${isDarkMode ? "border-zinc-800" : "border-gray-200"}`}>
              <p className={`text-center mb-4 ${isDarkMode ? "text-zinc-600" : "text-gray-400"}`}>🖼️ 생성된 증명사진 (4장)</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => <div key={i} className={`aspect-[3/4] rounded-lg ${isDarkMode ? "bg-zinc-800" : "bg-gray-100"}`} />)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 베리에이션 모달 */}
      {variationModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)" }}>
          <div className={`w-full h-full max-w-[95vw] max-h-[95vh] rounded-2xl overflow-hidden flex flex-col ${isDarkMode ? "bg-zinc-900 border-zinc-700" : "bg-white border-gray-300"} border`}>
            <div className={`flex items-center justify-between p-6 border-b ${isDarkMode ? "border-zinc-700" : "border-gray-200"}`}>
              <div>
                <h3 className="text-2xl font-bold">🔄 베리에이션 <span className={`text-base font-normal px-3 py-1 rounded-full ${variationModal.originalModel === "GPT-5.2" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>{variationModal.originalModel}</span></h3>
                <p className={`text-sm mt-1 ${isDarkMode ? "text-zinc-500" : "text-gray-500"}`}>({variationModal.completedCount}/6)</p>
              </div>
              <button onClick={() => setVariationModal(prev => ({ ...prev, isOpen: false }))} className={`p-3 rounded-xl text-xl ${isDarkMode ? "hover:bg-zinc-800" : "hover:bg-gray-200"}`}>✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {variationModal.results.map((r, i) => (
                  <ResultCard key={r.id} result={r} index={i} accentColor={variationModal.originalModel === "GPT-5.2" ? "emerald" : "amber"} isVariation={true}
                    onTranslate={() => handleTranslate(r.id, () => r.content, updateVariationResult)} onReview={() => handleReview(r.content)} />
                ))}
                {variationModal.isLoading && variationModal.results.length < 6 && Array.from({ length: 6 - variationModal.results.length }).map((_, i) => <LoadingCard key={`lv-${i}`} accentColor={variationModal.originalModel === "GPT-5.2" ? "emerald" : "amber"} />)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 교차 검증 모달 */}
      {reviewModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)" }}>
          <div className={`w-full max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col ${isDarkMode ? "bg-zinc-900 border-zinc-700" : "bg-white border-gray-300"} border`}>
            <div className={`flex items-center justify-between p-6 border-b ${isDarkMode ? "border-zinc-700" : "border-gray-200"}`}>
              <h3 className="text-2xl font-bold">🔍 교차 검증 리포트</h3>
              <button onClick={() => setReviewModal(prev => ({ ...prev, isOpen: false }))} className={`p-3 rounded-xl text-xl ${isDarkMode ? "hover:bg-zinc-800" : "hover:bg-gray-200"}`}>✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {reviewModal.isLoading ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4 animate-pulse">🔍</div>
                  <p className={isDarkMode ? "text-zinc-400" : "text-gray-500"}>AI가 자기소개서를 분석 중입니다...</p>
                </div>
              ) : reviewModal.review && (
                <div className="space-y-6">
                  {/* 종합 점수 */}
                  <div className={`p-6 rounded-xl ${isDarkMode ? "bg-zinc-800" : "bg-gray-100"}`}>
                    <div className="flex items-center gap-4 mb-3">
                      <div className={`text-4xl font-bold ${reviewModal.review.overall_score >= 80 ? "text-emerald-500" : reviewModal.review.overall_score >= 60 ? "text-amber-500" : "text-red-500"}`}>
                        {reviewModal.review.overall_score}점
                      </div>
                      <div className="flex-1 h-3 rounded-full bg-zinc-700 overflow-hidden">
                        <div className={`h-full rounded-full ${reviewModal.review.overall_score >= 80 ? "bg-emerald-500" : reviewModal.review.overall_score >= 60 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${reviewModal.review.overall_score}%` }} />
                      </div>
                    </div>
                    <p className={isDarkMode ? "text-zinc-300" : "text-gray-700"}>{reviewModal.review.overall_comment}</p>
                  </div>

                  {/* 잘 쓴 부분 (초록) */}
                  {reviewModal.review.strengths?.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold mb-3 flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500"></span>✅ 잘 쓴 부분</h4>
                      <div className="space-y-3">
                        {reviewModal.review.strengths.map((s, i) => (
                          <div key={i} className={`p-4 rounded-xl border-l-4 border-emerald-500 ${isDarkMode ? "bg-emerald-500/10" : "bg-emerald-50"}`}>
                            <p className={`font-medium mb-1 ${isDarkMode ? "text-emerald-400" : "text-emerald-700"}`}>"{s.text}"</p>
                            <p className={`text-sm ${isDarkMode ? "text-zinc-400" : "text-gray-600"}`}>{s.comment}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 수정 필요 (빨강) */}
                  {reviewModal.review.improvements?.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold mb-3 flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500"></span>🔴 수정이 필요한 부분</h4>
                      <div className="space-y-3">
                        {reviewModal.review.improvements.map((item, i) => (
                          <div key={i} className={`p-4 rounded-xl border-l-4 border-red-500 ${isDarkMode ? "bg-red-500/10" : "bg-red-50"}`}>
                            <p className={`font-medium mb-2 line-through ${isDarkMode ? "text-red-400" : "text-red-600"}`}>"{item.original}"</p>
                            <p className={`font-medium mb-1 ${isDarkMode ? "text-emerald-400" : "text-emerald-700"}`}>→ {item.suggestion}</p>
                            <p className={`text-sm ${isDarkMode ? "text-zinc-400" : "text-gray-600"}`}>{item.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 추가 권장 (파랑) */}
                  {reviewModal.review.additions?.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold mb-3 flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"></span>🔵 추가하면 좋을 내용</h4>
                      <div className="space-y-3">
                        {reviewModal.review.additions.map((item, i) => (
                          <div key={i} className={`p-4 rounded-xl border-l-4 border-blue-500 ${isDarkMode ? "bg-blue-500/10" : "bg-blue-50"}`}>
                            <p className={`text-sm mb-1 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}>📍 {item.where}</p>
                            <p className={`font-medium mb-1 ${isDarkMode ? "text-zinc-200" : "text-gray-800"}`}>+ {item.content}</p>
                            <p className={`text-sm ${isDarkMode ? "text-zinc-400" : "text-gray-600"}`}>{item.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 어필 포인트 (보라) */}
                  {reviewModal.review.appeal_points?.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold mb-3 flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-purple-500"></span>💜 더 어필하면 좋을 부분</h4>
                      <div className="space-y-3">
                        {reviewModal.review.appeal_points.map((item, i) => (
                          <div key={i} className={`p-4 rounded-xl border-l-4 border-purple-500 ${isDarkMode ? "bg-purple-500/10" : "bg-purple-50"}`}>
                            <p className={`font-medium mb-1 ${isDarkMode ? "text-purple-400" : "text-purple-700"}`}>"{item.text}"</p>
                            <p className={`text-sm ${isDarkMode ? "text-zinc-400" : "text-gray-600"}`}>💡 {item.how}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 주의사항 (노랑) */}
                  {reviewModal.review.warnings?.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold mb-3 flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500"></span>⚠️ 주의사항</h4>
                      <div className="space-y-3">
                        {reviewModal.review.warnings.map((item, i) => (
                          <div key={i} className={`p-4 rounded-xl border-l-4 border-amber-500 ${isDarkMode ? "bg-amber-500/10" : "bg-amber-50"}`}>
                            <p className={`font-medium mb-1 ${isDarkMode ? "text-amber-400" : "text-amber-700"}`}>"{item.text}"</p>
                            <p className={`text-sm ${isDarkMode ? "text-zinc-400" : "text-gray-600"}`}>{item.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 푸터 */}
      <footer className={`border-t mt-16 ${isDarkMode ? "border-zinc-800" : "border-gray-200"}`}>
        <div className={`max-w-7xl mx-auto px-6 py-8 text-center text-sm ${isDarkMode ? "text-zinc-500" : "text-gray-500"}`}>
          <p>Powered by <span className="text-emerald-500">GPT-5.2</span> & <span className="text-amber-500">Claude 4.5</span></p>
          <p className="mt-1">© 2026 WriteCopy</p>
        </div>
      </footer>
    </main>
  );
}
