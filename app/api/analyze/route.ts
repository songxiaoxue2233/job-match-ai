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
7. jobRecommendations 必须给 6 个方向，其中前 3 个必须是“强相关岗位”，后 3 个可以是“相关拓展岗位”。
8. 前 3 个“强相关岗位”必须与用户职业期待中输入的目标岗位高度相关，相关度至少达到 80%，不能偏离用户输入的核心岗位方向。
9. 如果用户输入“北京品牌策划实习”，前 3 个必须围绕“品牌策划、品牌营销、品牌传播、市场策划、品牌推广实习”等方向展开，不能直接发散成泛运营、内容运营、用户运营等弱相关岗位。
10. 前 3 个岗位不仅要和用户输入岗位相关，还必须结合用户简历中过去的经历、项目、技能或行业背景来说明为什么匹配。
11. 后 3 个“相关拓展岗位”可以基于能力迁移进行拓展，但必须解释与用户目标岗位之间的关系，相关度至少达到 50%。
12. 如果用户过去经历和目标岗位匹配度不足，也要优先推荐目标岗位的入门版、助理版或实习版，而不是直接换成完全不同的岗位。
13. matchScore 是 0 到 100 的整数，表示简历与该方向的适配度。
14. 生成岗位推荐前，必须先识别用户职业期待中的“核心目标岗位关键词”，例如“品牌策划”“产品经理”“数据分析”“新媒体运营”等。前 3 个岗位必须围绕这个核心关键词生成。
15. 如果需要推荐拓展岗位，只能放在第 4-6 个，且要标注为“相关拓展”。
16. 不允许在第 1 个岗位把用户明确输入的目标岗位替换成系统自己认为更容易匹配的岗位。
17. responsibilities 和 requirements 是岗位方向的常见信息，不要伪装成某个真实公司 JD
18. companyType 只能写公司类型，例如“大厂内容平台”“跨境电商公司”“AI 工具创业公司”，不要写具体公司名称
19. city 和 salaryRange 只能根据用户期待与岗位类型给参考，不要伪装成真实招聘信息
20. 不要返回 JSON 以外的解释文字
21. jobRecommendations 展示的是“AI 推荐岗位方向”，不是实时招聘岗位
22. 不要返回具体公司名称，例如不要写腾讯、字节、网易、小红书等具体公司
23. companyType 只能写公司类型，例如“AI 工具公司”“互联网平台公司”“电商平台公司”“内容社区平台”“本地生活平台”
24. salaryRange 只能作为薪资参考，不代表真实在招岗位薪资
25. searchTip 需要告诉用户可以去 BOSS 直聘、实习僧等平台搜索该岗位方向
26. 要按照用户简历的真实情况给出适配度不能故意往用户想要的方向编高分

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
