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
      { error: "正在努力匹配中，稍等一下，如果等待过久，请在“帮助反馈”联系管理员。" },
      { status: 500 },
    );
  }

  try {
    const { resumeText, expectation, targetJd = "", jobType = "不限" } = await request.json();
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
              "你是一位谨慎、实用、专业的中文职业规划顾问。请根据简历和职业期待给出求职匹配分析。不要编造真实公司正在招聘的信息，只给方向性建议。只返回 JSON，不要返回 Markdown。",
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
      "industryType": "适合关注的行业类型",
      "matchScore": 85,
      "skillScore": 88,
"experienceScore": 82,
"directionScore": 90,
"sourceName": "用户粘贴的真实 JD",
"sourceUrl": "",
"disclaimer": "本结果基于用户提供的JD和简历生成，仅供求职决策参考，具体招聘信息以原平台为准。",
      "matchReason": "为什么适合",
      "searchTip": "应该怎么搜索这个方向",
      "responsibilities": ["可能的工作内容1", "可能的工作内容2", "可能的工作内容3"],
      "requirements": ["常见要求1", "常见要求2", "常见要求3"],
      "prepTips": ["投递前准备建议1", "投递前准备建议2"]
    }
  ],
  "riskNotes": ["需要注意的短板1", "需要注意的短板2"]
}

要求：
请根据候选人简历、求职类型、职业期待和用户提供的目标岗位 JD，生成中文求职匹配分析结果。

你必须先完成以下判断，但不要把判断过程输出给用户：
1. 识别用户职业期待中的核心目标岗位关键词，例如“品牌策划”“产品经理”“数据分析”“新媒体运营”“后端开发”等。
2. 判断用户是否提供了 targetJd。
3. 如果提供了 targetJd，优先以 targetJd 作为岗位匹配依据。
4. 如果 targetJd 与职业期待冲突，优先按照 targetJd 分析，并在 riskNotes 中说明冲突点。
5. 判断用户简历中的真实经历、项目、技能、行业背景和目标岗位之间的关联度。
6. 不允许为了迎合用户期待而故意提高匹配分数。

输出要求：
1. 所有内容必须是中文。
2. 每条内容用短句，适合放在网页卡片里。
3. 只返回 JSON，不要返回 Markdown，不要返回解释文字。
4. 不要编造具体公司正在招聘。
5. 不要返回具体公司名称，例如腾讯、字节、网易、小红书等。
6. jobRecommendations 展示的是“AI 推荐岗位方向”，不是实时招聘岗位。
7. responsibilities 和 requirements 只能写岗位方向的常见信息，不要伪装成某家公司真实 JD。
8. industryType 只能写根据岗位最推荐的行业类型且是目前发展趋势较好的行业。
9. city 和 salaryRange 只能根据用户期待与岗位类型给参考，不要伪装成真实招聘信息。
10. searchTip 需要告诉用户可以去 BOSS 直聘、实习僧等平台搜索该岗位方向。
11. disclaimer 必须提醒用户：结果仅供参考，具体招聘信息以原平台为准。

求职类型规则：
1. 如果求职类型是“实习”，推荐岗位必须明显偏实习或入门级，不要默认推荐正职经理岗。
2. 如果求职类型是“校招”，推荐岗位必须偏应届生、管培生、助理、初级岗。
3. 如果求职类型是“社招”，可以推荐正式岗位，但要结合候选人经验年限，不要过度拔高。
4. 如果用户过去经历和目标岗位匹配度不足，也要优先推荐目标岗位的入门版、助理版或实习版，不要直接换成完全不同的岗位。

岗位推荐规则：
1. jobRecommendations 必须返回 6 个岗位方向。
2. 前 3 个必须是“强相关岗位”。
3. 后 3 个可以是“相关拓展岗位”。
4. 前 3 个岗位必须围绕用户职业期待中的核心目标岗位关键词生成，不能替换成系统自己认为更容易匹配的岗位。
5. 前 3 个岗位与用户目标岗位的相关度必须至少达到 80%。
6. 前 3 个岗位不仅要和用户目标岗位相关，还必须结合用户简历中的真实经历、项目、技能或行业背景说明为什么匹配。
7. 如果用户输入“北京品牌策划实习”，前 3 个必须围绕“品牌策划实习、品牌营销实习、品牌传播实习、市场策划实习、品牌推广实习”等方向展开，不能发散成泛运营、内容运营、用户运营等弱相关岗位。
8. 后 3 个岗位可以基于能力迁移拓展，但必须解释它和用户目标岗位之间的关系，相关度至少达到 50%。
9. 如果需要推荐拓展岗位，只能放在第 4-6 个，并将 type 标注为“相关拓展”。
10. 如果用户提供了 targetJd，前 3 个岗位必须与 targetJd 高度相关，不能偏离到泛运营、泛产品、泛市场。

评分规则：
1. matchScore 是 0 到 100 的整数，表示简历与该岗位方向的综合适配度。
2. skillScore 是 0 到 100 的整数，表示技能匹配度。
3. experienceScore 是 0 到 100 的整数，表示经历匹配度。
4. directionScore 是 0 到 100 的整数，表示求职方向匹配度。
5. 所有分数必须基于用户简历的真实情况，不要故意往用户想要的方向编高分。
6. 如果用户缺少关键经历或技能，分数应合理降低，并在 riskNotes 或 matchReason 中说明原因。

来源规则：
1. 如果用户提供了 targetJd，sourceName 写“用户粘贴的真实 JD”。
2. 如果用户没有提供 targetJd，sourceName 写“AI 推荐岗位方向”。
3. sourceUrl 如果没有真实链接就返回空字符串。
4. disclaimer 写：“本结果由 AI 根据你的简历、职业期待和岗位信息生成，仅供求职决策参考，具体招聘信息以原平台为准。”


候选人简历：
${resumeText.slice(0, 12000)}

职业期待：
${expectation}

用户粘贴的真实岗位 JD：
${targetJd || "用户没有粘贴真实 JD，请根据职业期待和简历进行方向性推荐。"},
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
