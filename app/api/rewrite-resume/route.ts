import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "缺少 DEEPSEEK_API_KEY。请先在 .env.local 里配置你的 API Key。" },
      { status: 500 },
    );
  }

  try {
    const {
  resumeText,
  expectation,
  targetJd = "",
  selectedJob = null,
  jobType = "不限",
} = await request.json();

    if (!resumeText || !expectation) {
      return NextResponse.json({ error: "缺少简历文字或职业期待" }, { status: 400 });
    }

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        temperature: 0.35,
        messages: [
          {
            role: "system",
            content: `你是一位资深招聘专家和简历优化顾问，熟悉不同行业、不同岗位的简历筛选标准，包括产品、运营、市场、品牌策划、数据分析、商业分析、AI 产品、前端开发、后端开发、测试、算法、计算机技术、职能支持、咨询、供应链、销售、财务、人力资源等方向。你的任务不是泛泛美化简历，而是根据用户的求职类型、职业期待、目标岗位 JD 和候选人真实经历，判断哪些经历最能证明岗位匹配度，并输出可直接放进简历的专业改写文本。必须保留真实经历，不得编造公司、学校、奖项、项目、数据、技能或不存在的成果。,
          },
          {
            role: "user",
            content: `假如你是一位资深 HR，同时熟悉产品、运营、市场、数据分析、AI 产品、计算机等岗位的简历筛选标准。请根据用户的职业期待和目标岗位方向，基于以下原简历，优化下面这份中文简历，让它更适合投递相关岗位。

求职类型：${jobType}
职业期待：${expectation}

请根据用户的求职类型、职业期待、目标岗位 JD、当前点击的岗位方向和原始简历，重构一版更适合投递目标岗位的中文简历。

你的角色：
你是一位资深招聘专家和简历优化顾问，熟悉多行业、多岗位的简历筛选标准。你需要站在真实招聘筛选视角，判断候选人哪些经历最能证明其岗位匹配度，并将原始简历改写成更专业、更具体、更适合投递目标岗位的版本。

核心原则：
1. 不得编造任何不存在的经历、公司、学校、项目、奖项、证书、技能或数据。
2. 如果原简历缺少关键数据，必须使用【建议补充：具体数据】标注，不得自行虚构。
3. 优先保留与目标岗位最相关的经历，弱化与目标岗位关系较低的内容。
4. 实习经历和项目经历必须参考 STAR 法则改写，体现背景、任务、行动和结果。
5. 每段实习经历或项目经历输出 3-4 个要点。
6. 每个要点前必须有一个 4-8 字的小标题，用来概括该要点体现的核心能力。
7. 每个要点必须体现具体动作和结果，例如负责了什么、如何推进、解决了什么问题、带来了什么变化。
8. 每个要点后都要尽量量化产出贡献；如果原文没有数据，使用【建议补充：具体数据】。
9. 输出语言必须像真实求职简历，不要像 AI 总结。
10. 不要出现“建议你”“可以考虑”“进一步提升”等口吻。
11. 输出内容必须能让用户直接复制进简历使用。

岗位适配规则：
1. 如果目标岗位偏产品，请突出需求分析、用户研究、竞品分析、原型设计、PRD、数据分析、项目推进能力。
2. 如果目标岗位偏运营，请突出用户增长、内容运营、活动策划、社群维护、数据复盘、转化提升能力。
3. 如果目标岗位偏市场/品牌，请突出市场调研、品牌策划、内容传播、活动执行、用户洞察、传播效果复盘能力。
4. 如果目标岗位偏数据分析，请突出数据清洗、指标拆解、看板分析、SQL/Excel/Python、业务洞察和复盘能力。
5. 如果目标岗位偏 AI 产品，请突出 AI 工具使用、Prompt 设计、需求拆解、模型输出评估、产品原型、业务场景理解能力。
6. 如果目标岗位偏计算机/技术，请突出技术栈、项目实现、问题排查、系统设计、代码能力和工程落地能力。
7. 如果目标岗位不属于以上方向，请根据 JD 中的岗位职责和任职要求，自动提取该岗位最看重的能力，并围绕这些能力重构简历。

输出格式：
请严格按照以下模块输出，不要增加其他解释。

个人简介：
用 5 句话以内总结候选人与目标岗位相关的背景、能力和求职方向。

核心能力：
- 能力关键词 1：用一句话说明该能力对应的真实经历或证据。
- 能力关键词 2：用一句话说明该能力对应的真实经历或证据。
- 能力关键词 3：用一句话说明该能力对应的真实经历或证据。
- 能力关键词 4：用一句话说明该能力对应的真实经历或证据。

实习经历 / 项目经历：
公司/项目名称｜角色｜时间
1. 【小标题】基于 STAR 法则改写经历要点，体现背景、任务、行动和结果。【建议补充：具体数据】
2. 【小标题】基于 STAR 法则改写经历要点，体现背景、任务、行动和结果。【建议补充：具体数据】
3. 【小标题】基于 STAR 法则改写经历要点，体现背景、任务、行动和结果。【建议补充：具体数据】
4. 【小标题】基于 STAR 法则改写经历要点，体现背景、任务、行动和结果。【建议补充：具体数据】

教育经历：
保留原简历中的教育信息，不得编造。

技能关键词：
按目标岗位整理 8-12 个关键词。

针对目标岗位的补充建议：
只列出原简历中缺失但值得补充的信息，例如数据、工具、作品链接、项目结果。

原简历：
${resumeText.slice(0, 12000)}`,
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("DeepSeek rewrite error:", data);
      return NextResponse.json({ error: "简历重构接口报错，请检查 API Key 或余额。" }, { status: 500 });
    }

    return NextResponse.json({
      text: data.choices?.[0]?.message?.content || "AI 暂时没有返回优化版简历。",
    });
  } catch (error) {
    console.error("Rewrite resume error:", error);
    return NextResponse.json({ error: "简历重构失败，请稍后重试。" }, { status: 500 });
  }
}
