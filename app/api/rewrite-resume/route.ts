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

重要原则：
1. 不得编造任何不存在的经历、公司、学校、项目、奖项、证书、技能或数据。
2. 如果原简历缺少关键数据，请使用【建议补充：具体数据】标注，不要自行虚构。
3. 优先保留与目标岗位最相关的经历，弱化与目标岗位关系较低的内容。
4. 实习经历和项目经历必须参考 STAR 法则改写，体现背景、任务、行动和结果。
5. 每段实习经历或项目经历输出 3-4 个要点。
6. 每个要点前必须有一个简短小标题，小标题控制在 4-8 个字，例如【用户调研】、【需求分析】、【活动策划】、【数据复盘】、【模型应用】、【流程优化】。
7. 每个要点尽量体现动作和结果，例如负责了什么、怎么推进、解决了什么问题、带来了什么变化。
8. 如果目标岗位偏产品，请突出需求分析、用户研究、竞品分析、原型设计、PRD、数据分析、项目推进能力。
9. 如果目标岗位偏运营，请突出用户增长、内容运营、活动策划、社群维护、数据复盘、转化提升能力。
10. 如果目标岗位偏市场/品牌，请突出市场调研、品牌策划、内容传播、活动执行、用户洞察、传播效果复盘能力。
11. 如果目标岗位偏数据分析，请突出数据清洗、指标拆解、看板分析、SQL/Excel/Python、业务洞察和复盘能力。
12. 如果目标岗位偏 AI 产品，请突出 AI 工具使用、Prompt 设计、需求拆解、模型输出评估、产品原型、业务场景理解能力。
13. 如果目标岗位偏计算机/技术，请突出技术栈、项目实现、问题排查、系统设计、代码能力和工程落地能力。
14. 输出语言要像真实求职简历，不要像 AI 总结，不要出现“建议你”“可以考虑”“进一步提升”等口吻。
15. 输出内容必须能让用户直接复制进简历使用。

格式要求：
1. 必须包含以下模块：
   - 个人简介
   - 核心能力
   - 实习经历 / 项目经历
   - 教育经历
   - 技能关键词

2. 实习经历 / 项目经历必须包含 3-4 个小点。
3. 每一个小点前面必须有一个简短小标题，用来概括这一点的核心能力。
4. 小标题字数不要太长，建议 4-8 个字。
5. 每个小点都要参考 STAR 法则：
   - S：背景 / 场景
   - T：任务 / 目标
   - A：行动 / 做法
   - R：结果 / 产出
6. 每个小点后都要尽量用数据量化产出贡献。
7. 如果原简历没有提供数据，不要编造数字，要写成【建议补充具体数据】。
8. 优先突出以下能力：
   - 用户洞察
   - 数据分析
   - 活动运营
   - 产品思维
   - 跨团队沟通
   - 项目推进
   - 内容整合
   - 复盘总结
9. 个人简介用 5 句话以内总结候选人与目标岗位相关的背景、能力和求职方向。
10. 针对目标岗位的补充建议只列出原简历中缺失但值得补充的信息，例如数据、工具、作品链接、项目结果。

实习经历 / 项目经历输出示例格式：

实习经历 / 项目经历

1. 用户洞察：
在【具体场景】下，负责【具体任务】，通过【具体行动】，最终实现【具体结果】。【建议补充具体数据】

2. 数据分析：
围绕【具体问题】，整理并分析【具体数据/反馈】，定位【关键原因】，推动【后续动作】。【建议补充具体数据】

3. 项目推进：
参与【具体项目】，负责【具体模块】，协同【相关角色】，完成【具体交付物】。【建议补充具体数据】

4. 复盘优化：
基于【活动/项目/用户反馈】，总结【问题和机会点】，输出【复盘结论或优化建议】。【建议补充具体数据】

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
