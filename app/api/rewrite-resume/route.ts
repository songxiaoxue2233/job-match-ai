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
    const { resumeText, expectation, jobType = "不限" } = await request.json();

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
            content: `请基于以下原简历，重写一版更适合投递的中文简历文本。

求职类型：${jobType}
职业期待：${expectation}

要求：
1. 不要编造经历、公司、学校、奖项或数字
2. 可以优化措辞、结构和重点
3. 如果原简历缺少某些信息，用【待补充】标记
4. 输出结构要适合用户直接复制到简历里
5. 包含：个人简介、核心能力、项目/实习经历、教育经历、技能关键词
6. 只输出优化后的简历正文，不要额外解释

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
