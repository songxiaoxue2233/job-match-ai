import { NextResponse } from "next/server";

export const runtime = "nodejs";

function parseJsonFromText(text: string) {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  return JSON.parse(cleaned);
}

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
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content:
              "你是一位谨慎、实用的中文职业规划顾问。请根据简历和职业期待给出求职匹配分析。不要编造真实公司正在招聘的信息，只给方向性建议。只返回 JSON，不要返回 Markdown。",
          },
          {
            role: "user",
            content: `请分析以下候选人的求职匹配情况，并返回 JSON。

用户选择的求职类型是：${jobType}

JSON 格式必须是：
{
  "profileSummary": ["候选人画像句子1", "候选人画像句子2", "候选人画像句子3"],
  "strengths": ["优势1", "优势2", "优势3", "优势4"],
  "jobDirections": ["岗位方向1", "岗位方向2", "岗位方向3", "岗位方向4"],
  "resumeSuggestions": ["建议1", "建议2", "建议3"],
  "searchKeywords": ["关键词1", "关键词2", "关键词3", "关键词4", "关键词5"],
  "jobRecommendations": [
    {
      "title": "推荐岗位名称",
      "type": "直接匹配或相关拓展",
      "companyType": "适合关注的公司类型",
      "city": "推荐城市",
      "salaryRange": "薪资/日薪参考",
      "matchScore": 85,
      "matchReason": "为什么适合",
      "searchTip": "应该怎么搜索这个方向",
      "responsibilities": ["可能的工作内容1", "可能的工作内容2", "可能的工作内容3"],
      "requirements": ["常见要求1", "常见要求2", "常见要求3"],
      "prepTips": ["投递前准备建议1", "投递前准备建议2"]
    }
  ],
  "riskNotes": ["需要注意的风险或短板1", "需要注意的风险或短板2"]
}

要求：
1. 所有内容必须是中文
2. 每条内容用短句，适合放在网页卡片里
3. 不要编造具体公司正在招聘
4. 如果求职类型是“实习”，推荐岗位必须明显偏实习或入门级，不要默认推荐正职经理岗
5. 如果求职类型是“校招”，推荐岗位必须偏应届生、管培生、助理、初级岗
6. 如果求职类型是“社招”，可以推荐正式岗位，但要结合候选人经验年限，不要过度拔高
7. jobRecommendations 必须给 6 个方向，其中 3 个是“直接匹配”，3 个是“相关拓展”
8. 相关拓展不能只是用户原话换个说法，要基于能力迁移，例如产品、运营、用户研究、商业分析、市场策略、数据分析、项目管理等相邻方向
9. matchScore 是 0 到 100 的整数，表示简历与该方向的适配度
10. responsibilities 和 requirements 是岗位方向的常见信息，不要伪装成某个真实公司 JD
11. companyType 只能写公司类型，例如“大厂内容平台”“跨境电商公司”“AI 工具创业公司”，不要写具体公司名称
12. city 和 salaryRange 只能根据用户期待与岗位类型给参考，不要伪装成真实招聘信息
13. 不要返回 JSON 以外的解释文字

候选人简历：
${resumeText.slice(0, 12000)}

职业期待：
${expectation}`,
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("DeepSeek API error:", data);
      return NextResponse.json({ error: "DeepSeek 分析接口报错，请检查 API Key 或余额。" }, { status: 500 });
    }

    const text = data.choices?.[0]?.message?.content || "";

    if (!text) {
      return NextResponse.json({ error: "DeepSeek 暂时没有返回分析结果。" }, { status: 500 });
    }

    try {
      return NextResponse.json({ report: parseJsonFromText(text), rawText: text });
    } catch {
      return NextResponse.json({ text });
    }
  } catch (error) {
    console.error("Analyze error:", error);
    return NextResponse.json({ error: "AI 分析失败，请稍后重试。" }, { status: 500 });
  }
}
