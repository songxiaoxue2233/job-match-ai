"use client";

import { useEffect, useState } from "react";

type AnalysisReport = {
  profileSummary?: string[];
  strengths?: string[];
  jobDirections?: string[];
  resumeSuggestions?: string[];
  searchKeywords?: string[];
  jobRecommendations?: JobRecommendation[];
  riskNotes?: string[];
};

type JobRecommendation = {
  title: string;
  type?: string;
  companyType?: string;
  city?: string;
  salaryRange?: string;
  matchScore?: number;
  matchReason: string;
  searchTip: string;
  responsibilities?: string[];
  requirements?: string[];
  prepTips?: string[];
};

type HistoryItem = {
  id: string;
  fileName: string;
  expectation: string;
  jobType: string;
  report: AnalysisReport | null;
  text: string;
  createdAt: number;
};

type DemoUser = {
  name: string;
  email: string;
};

function getBossSearchUrl(keyword: string) {
  return `https://www.zhipin.com/web/geek/job?query=${encodeURIComponent(keyword)}`;
}

function getShixisengSearchUrl(keyword: string) {
  return `https://www.shixiseng.com/interns?keyword=${encodeURIComponent(keyword)}`;
}

export default function Home() {
  const [fileName, setFileName] = useState("");
  const [expectation, setExpectation] = useState("");
  const [jobType, setJobType] = useState("实习");
  const [message, setMessage] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [resumeText, setResumeText] = useState("");
  const [isReadingPdf, setIsReadingPdf] = useState(false);
  const [pdfReadFailed, setPdfReadFailed] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisText, setAnalysisText] = useState("");
  const [analysisReport, setAnalysisReport] = useState<AnalysisReport | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [selectedJob, setSelectedJob] = useState<JobRecommendation | null>(null);
  const [rewrittenResume, setRewrittenResume] = useState("");
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewriteMessage, setRewriteMessage] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [user, setUser] = useState<DemoUser | null>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem("jobmatch_history");
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }

    const savedUser = localStorage.getItem("jobmatch_user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  function loginAsDemoUser() {
    const demoUser = {
      name: "体验用户",
      email: "demo@jobmatch.ai",
    };

    setUser(demoUser);
    localStorage.setItem("jobmatch_user", JSON.stringify(demoUser));
    setShowLogin(false);
  }

  function logout() {
    setUser(null);
    localStorage.removeItem("jobmatch_user");
  }

  function saveCurrentReport() {
    if (!analysisReport && !analysisText) {
      setSavedMessage("还没有可保存的分析报告。");
      return;
    }

    const nextHistory = [
      {
        id: String(Date.now()),
        fileName,
        expectation,
        jobType,
        report: analysisReport,
        text: analysisText,
        createdAt: Date.now(),
      },
      ...history,
    ].slice(0, 10);

    setHistory(nextHistory);
    localStorage.setItem("jobmatch_history", JSON.stringify(nextHistory));
    setSavedMessage("已保存到历史记录。");
  }

  function restoreHistory(item: HistoryItem) {
    setFileName(item.fileName);
    setExpectation(item.expectation);
    setJobType(item.jobType || "不限");
    setAnalysisReport(item.report);
    setAnalysisText(item.text);
    setMessage("已恢复历史分析。");
    setShowResult(true);
    setShowHistory(false);
    setRewrittenResume("");
    setRewriteMessage("");
  }

  async function rewriteResume() {
    if (!resumeText.trim()) {
      setRewriteMessage("请先上传并读取简历。");
      return;
    }

    if (!expectation.trim()) {
      setRewriteMessage("请先填写职业期待。");
      return;
    }

    setIsRewriting(true);
    setRewriteMessage("AI 正在重构简历，请稍等...");

    try {
      const response = await fetch("/api/rewrite-resume", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resumeText,
          expectation,
          jobType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setRewriteMessage(data.error || "简历重构失败，请稍后重试。");
        return;
      }

      setRewrittenResume(data.text || "");
      setRewriteMessage("优化版简历已生成，你可以直接在下方编辑。");
    } catch {
      setRewriteMessage("简历重构失败，请检查网站是否还在运行。");
    } finally {
      setIsRewriting(false);
    }
  }

  function downloadRewrittenResume() {
    if (!rewrittenResume.trim()) {
      setRewriteMessage("还没有可下载的优化版简历。");
      return;
    }

    const blob = new Blob([rewrittenResume], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "优化版简历.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function readPdf(file: File) {
    setIsReadingPdf(true);
    setResumeText("");
    setPdfReadFailed(false);
    setRewrittenResume("");
    setRewriteMessage("");
    setMessage("正在读取 PDF 简历，请稍等...");
    setShowResult(false);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/parse-pdf", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        setMessage(errorData?.error || "PDF 读取失败，请换一个 PDF 试试");
        setPdfReadFailed(true);
        return;
      }

      const data = await response.json();
      const text = data.text || "";

      if (!text.trim()) {
        setMessage("没有读到文字。这个 PDF 可能是图片扫描版。");
        setPdfReadFailed(true);
        return;
      }

      setResumeText(text);
      setPdfReadFailed(false);
      setMessage("PDF 读取成功，可以填写职业期待并开始筛选。");
    } catch {
      setMessage("PDF 读取失败，请检查网站是否还在运行。");
      setPdfReadFailed(true);
    } finally {
      setIsReadingPdf(false);
    }
  }

  async function handleStart() {
    if (!fileName) {
      setMessage("请先上传 PDF 简历");
      setShowResult(false);
      return;
    }

    if (isReadingPdf) {
      setMessage("PDF 还在读取中，请稍等一下");
      setShowResult(false);
      return;
    }

    const finalResumeText = resumeText.trim();

    if (!finalResumeText) {
      if (pdfReadFailed) {
        setMessage("这个 PDF 暂时没有读到文字。你可以把简历文字复制到下方的手动输入框里。");
      } else {
        setMessage("还没有读到简历文字，请重新上传 PDF");
      }
      setShowResult(false);
      return;
    }

    if (!expectation.trim()) {
      setMessage("请填写你的职业期待");
      setShowResult(false);
      return;
    }

    setIsAnalyzing(true);
    setShowResult(false);
    setAnalysisText("");
    setAnalysisReport(null);
    setSavedMessage("");
    setMessage("AI 正在分析简历，请稍等...");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resumeText: finalResumeText,
          expectation: expectation.trim(),
          jobType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "AI 分析失败，请稍后重试。");
        return;
      }

      if (data.report) {
        setAnalysisReport(data.report);
        setAnalysisText("");
      } else {
        setAnalysisReport(null);
        setAnalysisText(data.text || "AI 暂时没有返回分析结果。");
      }

      setMessage("AI 分析完成。");
      setShowResult(true);
    } catch {
      setMessage("AI 分析失败，请检查网站是否还在运行。");
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#f4f8fb] text-slate-800">
      <div className="bg-flowing" />

      <header className="sticky top-0 z-50 border-b border-white/60 bg-white/72 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-teal-500 shadow-lg shadow-blue-500/20">
              <span className="text-xl font-black text-white">J</span>
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-slate-900">
                JobMatch <span className="text-blue-600">AI</span>
              </h1>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-slate-400">
                Trial
              </span>
            </div>
          </div>

          <nav className="hidden h-full items-center gap-8 text-sm font-bold text-slate-600 md:flex">
  <a
    className="flex h-full items-center border-b-2 border-blue-600 px-1 text-blue-600"
    href="#match-form"
  >
    智能匹配
  </a>

  <a
    className="flex h-full items-center border-b-2 border-transparent px-1 transition-colors hover:text-blue-600"
    href="https://tally.so/r/obx0J1"
    target="_blank"
    rel="noopener noreferrer"
  >
    帮助中心
  </a>
</nav>

          {user ? (
            <div className="flex items-center gap-2">
              <button className="rounded-full bg-blue-50 px-4 py-2 text-xs font-black text-blue-700">
                {user.name}
              </button>
              <button
                className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-500 transition-colors hover:bg-slate-200"
                onClick={logout}
              >
                退出
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                className="rounded-xl bg-white px-5 py-2.5 text-xs font-black text-slate-700 shadow-sm ring-1 ring-slate-100 transition-all hover:-translate-y-0.5 hover:bg-slate-50"
                onClick={() => setShowLogin(true)}
              >
                登录
              </button>
              <a
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 hover:bg-blue-700"
                href="#match-form"
              >
                免费体验
              </a>
            </div>
          )}
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <section className="animate-rise space-y-10">
          <div className="grid items-center gap-10 lg:grid-cols-[1.02fr_0.98fr]">
            <div className="space-y-8">
              <p className="w-fit rounded-full border border-blue-100 bg-white/80 px-4 py-2 text-xs font-black tracking-wide text-blue-600 shadow-sm">
                AI 智能求职助手
              </p>
              <div className="space-y-5">
                <h2 className="text-5xl font-black leading-tight tracking-tight text-slate-950 sm:text-7xl">
                  AI 帮你找到
                  <span className="block bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-500 bg-clip-text text-transparent">
                    真正匹配的工作
                  </span>
                </h2>
                <p className="max-w-2xl text-lg font-semibold leading-8 text-slate-500 sm:text-xl">
                  上传简历，AI 为你深度分析，精准匹配更适合你的岗位方向、简历优化建议与投递准备。
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  ["岗位匹配度分析", "⌖"],
                  ["简历优化建议", "✎"],
                  ["相关岗位拓展", "✦"],
                  ["面试竞争力评估", "◇"],
                ].map(([label, icon]) => (
                  <div className="text-center" key={label}>
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-lg font-black text-blue-600 shadow-sm">
                      {icon}
                    </div>
                    <p className="mt-3 text-xs font-bold text-slate-600">{label}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <a
                  className="rounded-2xl bg-blue-600 px-8 py-4 text-center text-sm font-black text-white shadow-xl shadow-blue-600/20 transition-all hover:-translate-y-0.5 hover:bg-blue-700"
                  href="#match-form"
                >
                  立即上传简历
                </a>
                <button
                  className="rounded-2xl bg-white px-8 py-4 text-sm font-black text-slate-700 shadow-lg shadow-slate-900/5 ring-1 ring-slate-100 transition-all hover:-translate-y-0.5 hover:bg-slate-50"
                  onClick={() => setShowHistory(true)}
                >
                  查看历史记录
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-500">
                <span>简历仅用于分析</span>
                <span className="h-4 w-px bg-slate-200" />
                <span>数据本地暂存</span>
                <span className="h-4 w-px bg-slate-200" />
                <span>可导出优化版简历</span>
              </div>
            </div>

            <div className="surface rounded-[2rem] p-6 sm:p-8" id="match-form">
            <div className="space-y-9">
              <div className="space-y-4">
                <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                  1. 导入简历 PDF
                </label>
                <label className="group flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white/45 p-10 text-center transition-all hover:-translate-y-1 hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-xl hover:shadow-blue-500/10">
                  <input
                    className="hidden"
                    type="file"
                    accept=".pdf"
                    onChange={(event) => {
                      const selectedFile = event.target.files?.[0];
                      if (!selectedFile) {
                        return;
                      }

                      setFileName(selectedFile.name);
                      readPdf(selectedFile);
                    }}
                  />
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/25 ring-4 ring-blue-100">
                    <span className="text-2xl font-black">↑</span>
                  </div>
                  <p className="text-lg font-black text-slate-700">
                    {fileName ? `已选择：${fileName}` : "点击上传 PDF 简历"}
                  </p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {isReadingPdf ? "正在读取文件文字..." : fileName ? "点击可更换文件" : "AI 将自动识别你的核心优势"}
                  </p>
                </label>
                {pdfReadFailed ? (
                  <div className="space-y-3 rounded-2xl border border-amber-100 bg-amber-50/70 p-5 shadow-sm">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-600">
                        手动补救方案
                      </p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                        如果 PDF 是图片版，程序暂时读不到文字。你可以打开简历，复制正文后粘贴到这里。
                      </p>
                    </div>
                    <textarea
                      className="h-36 w-full resize-none rounded-2xl border border-amber-100 bg-white/80 p-4 text-sm font-semibold leading-6 text-slate-700 outline-none transition-all placeholder:text-slate-300 focus:border-amber-300 focus:ring-4 focus:ring-amber-200/40"
                      placeholder="把简历文字粘贴到这里..."
                      value={resumeText}
                      onChange={(event) => {
                        setResumeText(event.target.value);
                        setMessage("");
                        setShowResult(false);
                        setAnalysisText("");
                        setAnalysisReport(null);
                        setRewrittenResume("");
                        setRewriteMessage("");
                      }}
                    />
                  </div>
                ) : null}
              </div>

              <div className="space-y-4">
                <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                  2. 求职类型
                </label>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {["实习", "校招", "社招", "不限"].map((type) => (
                    <button
                      className={`rounded-2xl border px-4 py-3 text-sm font-black transition-all ${
                        jobType === type
                          ? "border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                          : "border-slate-200 bg-white/60 text-slate-500 hover:border-blue-200 hover:bg-blue-50"
                      }`}
                      key={type}
                      onClick={() => {
                        setJobType(type);
                        setShowResult(false);
                        setAnalysisText("");
                        setAnalysisReport(null);
                      }}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                  3. 职业期待
                </label>
                <textarea
                  className="h-40 w-full resize-none rounded-[2rem] border border-slate-200 bg-white/60 p-6 text-base font-semibold leading-7 text-slate-700 shadow-inner outline-none transition-all placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  placeholder="例如：北京产品经理，20k 以上，希望偏增长、数据分析、AIGC 产品方向..."
                  value={expectation}
                  onChange={(event) => {
                    setExpectation(event.target.value);
                    setMessage("");
                    setShowResult(false);
                    setAnalysisText("");
                    setAnalysisReport(null);
                    setRewrittenResume("");
                    setRewriteMessage("");
                  }}
                />
              </div>

              {message ? (
                <div className="rounded-2xl border border-blue-100 bg-blue-50/80 px-5 py-4 text-center text-sm font-bold text-blue-700">
                  {message}
                </div>
              ) : null}

              <button
                className="w-full rounded-[2rem] bg-gradient-to-r from-blue-600 to-teal-500 py-6 text-xl font-black text-white shadow-xl shadow-blue-600/20 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-600/25 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                disabled={isReadingPdf || isAnalyzing}
                onClick={handleStart}
              >
                {isReadingPdf ? "正在读取简历..." : isAnalyzing ? "AI 正在分析..." : "立即开启智能筛选"}
              </button>
            </div>
            </div>
          </div>

          <div className="surface grid gap-4 rounded-[1.75rem] p-5 sm:grid-cols-4">
            {[
              ["92%", "岗位匹配准确率"],
              ["12,000+", "模拟用户信赖使用"],
              ["3,000+", "成功获得面试"],
              ["4.9/5", "用户满意度"],
            ].map(([value, label]) => (
              <div className="flex items-center justify-center gap-4 border-slate-100 py-3 sm:border-r last:border-r-0" key={label}>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-lg font-black text-blue-600">
                  ✦
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-950">{value}</p>
                  <p className="text-sm font-bold text-slate-500">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {showResult ? (
            <div className="surface rounded-[2rem] p-6 sm:p-8">
              <div className="flex flex-col gap-3 border-b border-slate-100 pb-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
                    Demo report
                  </p>
                  <h3 className="mt-2 text-2xl font-black text-slate-900">AI 匹配报告</h3>
                </div>
                <p className="rounded-full bg-blue-50 px-4 py-2 text-xs font-black text-blue-700">
                  基于：{fileName}
                </p>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/80 p-5 shadow-inner">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  分析结果
                </p>
                {analysisReport ? (
                  <div className="mt-5 space-y-5">
                    <ReportBlock title="候选人画像" items={analysisReport.profileSummary} />
                    <ReportBlock title="核心优势" items={analysisReport.strengths} />
                    <ReportBlock title="适合岗位方向" items={analysisReport.jobDirections} />
                    <ReportBlock title="简历优化建议" items={analysisReport.resumeSuggestions} />
                    <ReportBlock title="需要注意" items={analysisReport.riskNotes} />
                    {analysisReport.jobRecommendations?.length ? (
                      <div>
                        <p className="text-sm font-black text-slate-800">推荐岗位方向</p>
                        <p className="mt-2 text-xs font-bold leading-6 text-slate-500">
  以下为 AI 根据简历生成的岗位方向建议，并非平台实时招聘岗位。点击 BOSS / 实习僧按钮可前往招聘平台查看真实岗位。
</p>
                        <div className="mt-3 grid gap-5 lg:grid-cols-2">
                          {analysisReport.jobRecommendations.map((job) => (
                            <article
                              className="rounded-[1.75rem] border border-white bg-white/86 p-5 shadow-xl shadow-slate-900/6 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-900/10"
                              key={job.title}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                  <h4 className="text-xl font-black leading-snug text-slate-900">{job.title}</h4>
                                  <p className="mt-1 text-sm font-black text-blue-600">
                                    {job.companyType || "适合关注的企业类型"}
                                  </p>
                                </div>
                                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-white shadow-lg ring-1 ring-slate-100">
                                  <div className="flex h-12 w-12 items-center justify-center rounded-full border-[6px] border-blue-600 text-center">
                                    <span className="text-xs font-black leading-none text-blue-700">
                                      {job.matchScore ?? 88}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-black">
                                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-500">
                                  {job.city || "城市待定"}
                                </span>
                                <span className="rounded-full bg-orange-50 px-3 py-1.5 text-orange-600 ring-1 ring-orange-100">
                                  {job.salaryRange || "薪资参考待定"}
                                </span>
                                {job.type ? (
                                  <span className="rounded-full bg-blue-50 px-3 py-1.5 text-blue-600">
                                    {job.type}
                                  </span>
                                ) : null}
                              </div>

                              <p className="mt-5 line-clamp-4 text-sm font-bold leading-7 text-slate-600">
                                <span className="text-slate-900">推荐分析：</span>
                                {job.matchReason}
                              </p>

                              <div className="mt-6">
                                <button
                                  className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/15 transition-all hover:bg-blue-700"
                                  onClick={() => setSelectedJob(job)}
                                >
                                  岗位详情
                                </button>
                              </div>
                              
                              <div className="mt-3 grid grid-cols-2 gap-3">
  <a
    className="rounded-2xl border border-blue-100 bg-white px-4 py-3 text-center text-sm font-black text-blue-700 transition-all hover:border-blue-200 hover:bg-blue-50"
    href={getBossSearchUrl(job.title)}
    rel="noopener noreferrer"
    target="_blank"
  >
    去 BOSS 搜索
  </a>
  <a
    className="rounded-2xl border border-teal-100 bg-white px-4 py-3 text-center text-sm font-black text-teal-700 transition-all hover:border-teal-200 hover:bg-teal-50"
    href={getShixisengSearchUrl(job.title)}
    rel="noopener noreferrer"
    target="_blank"
  >
    去实习僧搜索
  </a>
</div>
                            </article>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {analysisReport.searchKeywords?.length ? (
                      <div>
                        <p className="text-sm font-black text-slate-800">岗位搜索关键词</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {analysisReport.searchKeywords.map((keyword) => (
                            <span
                              className="rounded-full bg-blue-100 px-3 py-1.5 text-xs font-black text-blue-700"
                              key={keyword}
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <pre className="mt-4 whitespace-pre-wrap font-sans text-sm font-semibold leading-7 text-slate-700">
                    {analysisText}
                  </pre>
                )}
              </div>

              <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/70 p-5 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
                  你的职业期待
                </p>
                <p className="mt-3 text-sm font-semibold leading-7 text-slate-700">{expectation}</p>
                <p className="mt-3 text-xs font-black uppercase tracking-[0.18em] text-blue-600">
                  求职类型：{jobType}
                </p>
              </div>

              <div className="mt-6 flex flex-col items-center gap-3">
                {savedMessage ? <p className="text-sm font-black text-blue-600">{savedMessage}</p> : null}
                <button
                  className="rounded-full bg-slate-900 px-8 py-3 text-sm font-black text-white shadow-lg shadow-slate-900/15 transition-all hover:-translate-y-0.5 hover:bg-blue-600"
                  onClick={saveCurrentReport}
                >
                  保存本次分析报告
                </button>
              </div>

              <div className="mt-6 rounded-[2rem] border border-white/70 bg-white/82 p-6 shadow-xl shadow-slate-900/5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-600">
                      Resume rewrite
                    </p>
                    <h4 className="mt-2 text-xl font-black text-slate-900">简历重构编辑器</h4>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                      作为一名资深 HR，我们会参考 STAR 法则来重构您的简历；对于实习或项目经历，尽量用数据量化您的产出贡献，以此突出您的核心能力（我们并不会伪造您的经历）。生成后您可以直接在网页里修改。
                    </p>
                  </div>
                  <button
                    className="rounded-full bg-teal-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-teal-600/20 transition-all hover:-translate-y-0.5 hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isRewriting}
                    onClick={rewriteResume}
                  >
                    {isRewriting ? "正在重构..." : "生成优化版简历"}
                  </button>
                </div>

                {rewriteMessage ? (
                  <p className="mt-4 rounded-2xl bg-teal-50 px-4 py-3 text-sm font-black text-teal-700">
                    {rewriteMessage}
                  </p>
                ) : null}

                {rewrittenResume ? (
                  <div className="mt-5 space-y-4">
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div>
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <p className="text-sm font-black text-slate-800">原简历文字</p>
                          <button
                            className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-500 hover:bg-slate-200"
                            onClick={() => {
                              navigator.clipboard.writeText(resumeText);
                              setRewriteMessage("已复制原简历文字。");
                            }}
                          >
                            复制原文
                          </button>
                        </div>
                        <textarea
                          className="h-96 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50/80 p-5 text-sm font-semibold leading-7 text-slate-500 outline-none"
                          readOnly
                          value={resumeText}
                        />
                      </div>

                      <div>
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <p className="text-sm font-black text-slate-800">优化版简历</p>
                          <span className="rounded-full bg-teal-50 px-3 py-1.5 text-xs font-black text-teal-700">
                            可直接编辑
                          </span>
                        </div>
                        <textarea
                          className="h-96 w-full resize-y rounded-2xl border border-teal-100 bg-white p-5 text-sm font-semibold leading-7 text-slate-700 outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                          value={rewrittenResume}
                          onChange={(event) => setRewrittenResume(event.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        className="rounded-full bg-slate-900 px-6 py-3 text-sm font-black text-white transition-all hover:bg-blue-600"
                        onClick={downloadRewrittenResume}
                      >
                        下载为 TXT
                      </button>
                      <button
                        className="rounded-full bg-slate-100 px-6 py-3 text-sm font-black text-slate-600 transition-all hover:bg-slate-200"
                        onClick={() => {
                          navigator.clipboard.writeText(rewrittenResume);
                          setRewriteMessage("已复制优化版简历。");
                        }}
                      >
                        一键复制
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>
      </main>

      {showHistory ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm">
          <div className="max-h-[82vh] w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Local history</p>
                <h3 className="mt-2 text-2xl font-black text-slate-900">历史记录</h3>
              </div>
              <button
                className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-500 transition-colors hover:bg-slate-200"
                onClick={() => setShowHistory(false)}
              >
                关闭
              </button>
            </div>
            <div className="max-h-[60vh] space-y-3 overflow-y-auto p-6">
              {history.length ? (
                history.map((item) => (
                  <button
                    className="w-full rounded-2xl border border-slate-100 bg-white/80 p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                    key={item.id}
                    onClick={() => restoreHistory(item)}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-black text-slate-900">{item.fileName}</p>
                      <p className="text-xs font-bold text-slate-400">
                        {new Date(item.createdAt).toLocaleString("zh-CN")}
                      </p>
                    </div>
                    <p className="mt-2 line-clamp-1 text-sm font-semibold text-slate-500">
                      {item.jobType || "不限"} · {item.expectation}
                    </p>
                  </button>
                ))
              ) : (
                <div className="rounded-2xl bg-slate-50 p-10 text-center text-sm font-bold text-slate-400">
                  还没有保存过分析报告
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {selectedJob ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm">
          <div className="max-h-[86vh] w-full max-w-3xl overflow-hidden rounded-[2rem] border border-white/70 bg-white/95 shadow-2xl shadow-slate-900/15 backdrop-blur-xl">
            <div className="border-b border-slate-100 p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedJob.type ? (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                        {selectedJob.type}
                      </span>
                    ) : null}
                    {typeof selectedJob.matchScore === "number" ? (
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">
                        {selectedJob.matchScore}% 匹配
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-3 text-2xl font-black text-slate-900">{selectedJob.title}</h3>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
                    <span className="rounded-full bg-blue-50 px-3 py-1.5 text-blue-700">
                      {selectedJob.companyType || "企业类型待定"}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-600">
                      {selectedJob.city || "城市待定"}
                    </span>
                    <span className="rounded-full bg-orange-50 px-3 py-1.5 text-orange-600">
                      {selectedJob.salaryRange || "薪资参考待定"}
                    </span>
                  </div>
                  <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-slate-600">
                    {selectedJob.matchReason}
                  </p>
                </div>
                <button
                  className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-500 transition-colors hover:bg-slate-200"
                  onClick={() => setSelectedJob(null)}
                >
                  关闭
                </button>
              </div>
            </div>

            <div className="max-h-[62vh] space-y-5 overflow-y-auto p-6">
              <DetailBlock title="常见工作内容" items={selectedJob.responsibilities} />
              <DetailBlock title="常见任职要求" items={selectedJob.requirements} />
              <DetailBlock title="投递前准备" items={selectedJob.prepTips} />
              <div className="rounded-2xl border border-teal-100 bg-teal-50/70 p-5">
                <p className="text-sm font-black text-teal-800">搜索建议</p>
                <p className="mt-3 text-sm font-semibold leading-7 text-slate-700">{selectedJob.searchTip}</p>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-5">
                <p className="text-sm font-black text-amber-800">说明</p>
                <p className="mt-3 text-sm font-semibold leading-7 text-slate-700">
                  这里展示的是岗位方向详情，不是某家公司真实 JD。后续接入真实招聘数据后，可以在这里展示公司、薪资、职责和投递链接。
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showLogin ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] border border-white/70 bg-white/95 p-8 text-center shadow-2xl shadow-slate-900/15 backdrop-blur-xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-teal-500 shadow-lg shadow-blue-600/20">
              <span className="text-3xl font-black text-white">J</span>
            </div>
            <h3 className="mt-6 text-2xl font-black text-slate-900">开启 AI 职场之旅</h3>
            <p className="mt-3 text-sm font-semibold leading-7 text-slate-500">
              当前版本为体验版，登录仅用于保存本地历史记录和模拟用户状态，不会上传账号资料到云端。
            </p>

            <div className="mt-8 space-y-3">
              <button
                className="w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-lg shadow-slate-950/15 transition-all hover:-translate-y-0.5 hover:bg-blue-700"
                onClick={loginAsDemoUser}
              >
                使用体验账号登录
              </button>
              <button
                className="w-full rounded-2xl bg-slate-100 px-5 py-4 text-sm font-black text-slate-500 transition-colors hover:bg-slate-200"
                onClick={() => setShowLogin(false)}
              >
                暂不登录
              </button>
            </div>

            <p className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
              Demo auth · Local only
            </p>
          </div>
        </div>
      ) : null}

      <footer className="relative z-10 mt-8 border-t border-white/50 bg-white/55 py-10 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col items-center px-4 text-center">
          <p className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-400">
            © 2026 JobMatch AI · Experiential Trial Version
          </p>
          <p className="mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
            No persistent cloud storage
          </p>
        </div>
      </footer>
    </div>
  );
}

function ReportBlock({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) {
    return null;
  }

  return (
    <div>
      <p className="text-sm font-black text-slate-800">{title}</p>
      <div className="mt-3 grid gap-3">
        {items.map((item) => (
          <div className="rounded-2xl border border-slate-100 bg-white/84 p-4 text-sm font-semibold leading-7 text-slate-700 shadow-sm" key={item}>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailBlock({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/90 p-5">
      <p className="text-sm font-black text-slate-800">{title}</p>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li className="text-sm font-semibold leading-7 text-slate-700" key={item}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
