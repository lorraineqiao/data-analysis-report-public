import { NextRequest, NextResponse } from "next/server";
import { FetchClient, Config, HeaderUtils } from "coze-coding-dev-sdk";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    const config = new Config();
    const client = new FetchClient(config, customHeaders);

    const response = await client.fetch(url);

    if (response.status_code !== 0) {
      return NextResponse.json({
        success: false,
        error: response.status_message || "获取文档失败",
      });
    }

    // 提取文本内容
    const textContent = response.content
      .filter(item => item.type === 'text')
      .map(item => item.text)
      .join('\n');

    return NextResponse.json({
      success: true,
      title: response.title,
      content: textContent,
      url: response.url,
    });
  } catch (error) {
    console.error("Fetch error:", error);
    return NextResponse.json(
      { success: false, error: "服务暂时不可用" },
      { status: 500 }
    );
  }
}
