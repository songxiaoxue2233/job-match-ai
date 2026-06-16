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
            content:
              "你是一位中文简历优化顾问。请保留候选人真实经历，不要编造学历、公司、项目或数据。你的任务是把简历表达改得更清晰、更适合目标岗位。",
          },
          {
            role: "user",
            content: `假如你是一位资深 HR，同时熟悉产品、运营、市场、数据分析、AI 产品等岗位的简历筛选标准。请根据用户的职业期待和目标岗位方向，基于以下原简历，优化下面这份中文简历，让它更适合投递相关岗位。

求职类型：${jobType}
职业期待：${expectation}

重要原则：
1. 不要编造用户没有写过的经历、公司、学校、奖项或具体数据。
2. 可以优化表达方式、结构顺序和能力呈现。
3. 如果原简历缺少数据，可以用【建议补充具体数据】提示，但不能直接编造数字。
4. 输出内容要适合用户直接复制到简历里。
5. 语言要专业、清晰、结果导向，不要写得像 AI 生成文案。
6. 只输出优化后的简历正文，不要额外解释。

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
