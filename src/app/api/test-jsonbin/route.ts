import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    binId: process.env.NEXT_PUBLIC_JSONBIN_ID || "not set",
  });
}

export async function POST() {
  const JSONBIN_BASE_URL = "https://api.jsonbin.io/v3/b/";
  const binId = process.env.NEXT_PUBLIC_JSONBIN_ID || "69ef2f6236566621a8f7b983";

  try {
    // 直接写入测试数据
    const response = await fetch(`${JSONBIN_BASE_URL}${binId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        records: [{
          date: new Date().toISOString(),
          agentName: "测试用户",
          channelManager: "测试经理",
          summary: "API直接测试",
          test: true
        }]
      }),
    });

    const result = await response.json();
    
    return NextResponse.json({
      success: true,
      binId,
      response: result
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: String(error),
      binId
    }, { status: 500 });
  }
}
