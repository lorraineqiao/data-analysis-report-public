import { NextRequest, NextResponse } from "next/server";
import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";

// Excel数据分析的上下文
const EXCEL_CONTEXT = `
【Excel数据来源】
文件：本地客户营销预算分配表
时间周期：历史参照期(2025.9.27-10.8) vs 本期计划(2025.12.19-1.3)

【各渠道流量效率和CPM数据】

| 渠道 | 流量效率 | CPM | 类别 |
|------|---------|-----|------|
| 抖音搜索 | 1.60 | 80 | 搜索 |
| 搜索小计 | 1.59 | 79.52 | 搜索 |
| 达人视频 | 1.00 | 300 | 短视频 |
| 商家官方直播 | 0.94 | 175 | 直播 |
| 直播小计 | 0.85 | 166.49 | 直播 |
| 职人视频 | 0.50 | 100 | 短视频 |
| 达人直播 | 0.40 | 140 | 直播 |
| 团购搜索 | 0.33 | 0 | 搜索 |
| 总计 | 0.14 | 25.98 | - |
| 职人直播 | 0.125 | 62.5 | 直播 |
| 短视频小计 | 0.0054 | 4.74 | 短视频 |
| 官方账号主页视频 | 0.0008 | 3.46 | 短视频 |

【指标说明】
- 流量效率 = 成交金额 / 流量（越高越好，表示每流量带来的成交额）
- CPM = 总费用 / 流量 × 1000（越低越好，表示每千次曝光的成本）

【核心发现】
1. 流量效率最高：抖音搜索(1.60)、搜索小计(1.59)
2. 流量效率最低：官方账号主页视频(0.0008)
3. CPM最高：达人视频(300)
4. CPM最低：官方账号主页视频(3.46)
`;

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    // 构建系统提示词
    const systemPrompt = `你是专业的营销数据分析助手，专门帮助用户分析Excel表格中的营销预算数据。

你的职责：
1. 根据上述数据，回答用户关于流量效率、CPM、渠道优化等问题
2. 提供数据洞察和营销建议
3. 用清晰易懂的方式解释复杂的分析结果
4. 给出具体、可执行的优化建议

请用中文回答，语言简洁专业，适当使用表格或列表让数据更清晰。
如果用户询问的数据不在上下文中，诚实地说明无法获取相关信息。

${EXCEL_CONTEXT}`;

    // 构建完整的消息列表
    const fullMessages = [
      { role: "system" as const, content: systemPrompt },
      ...messages,
    ];

    // 使用流式响应
    const stream = client.stream(fullMessages, {
      model: "doubao-seed-2-0-lite-260215",
      temperature: 0.7,
    });

    // 创建流式响应
    const encoder = new TextEncoder();
    const stream2 = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.content) {
              controller.enqueue(encoder.encode(chunk.content.toString()));
            }
          }
        } catch (error) {
          console.error("Stream error:", error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream2, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "分析服务暂时不可用，请稍后重试" },
      { status: 500 }
    );
  }
}
