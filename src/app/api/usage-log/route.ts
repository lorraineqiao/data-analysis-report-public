import { NextRequest, NextResponse } from "next/server";

const JSONBIN_BASE_URL = "https://api.jsonbin.io/v3/b/";
// 使用一个公共Bin ID来存储数据
const DEFAULT_BIN_ID = "67f8c8e8ace6af77a9e2b456";

interface UsageRecord {
  date: string;
  agentName: string;
  channelManager: string;
  summary: string;
  screenshotUrl?: string;
}

// 获取Bin ID（优先使用环境变量，否则用默认）
function getBinId() {
  if (process.env.NEXT_PUBLIC_JSONBIN_ID) {
    return process.env.NEXT_PUBLIC_JSONBIN_ID;
  }
  return DEFAULT_BIN_ID;
}

// 获取所有使用记录
async function getUsageRecords(): Promise<UsageRecord[]> {
  try {
    const binId = getBinId();
    const response = await fetch(`${JSONBIN_BASE_URL}${binId}/latest`, {
      headers: {
        "X-Access-Key": "guest",
      },
    });
    if (!response.ok) {
      return [];
    }
    const data = await response.json();
    return data.record?.records || [];
  } catch {
    return [];
  }
}

// 保存使用记录
async function saveUsageRecords(records: UsageRecord[]): Promise<boolean> {
  try {
    const binId = getBinId();
    const response = await fetch(`${JSONBIN_BASE_URL}${binId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Access-Key": "guest",
      },
      body: JSON.stringify({ records }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentName, channelManager, summary, screenshotUrl } = body;

    const newRecord: UsageRecord = {
      date: new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
      agentName: agentName || "未知",
      channelManager: channelManager || "未知",
      summary: summary || "",
      screenshotUrl: screenshotUrl || "",
    };

    // 获取现有记录
    const records = await getUsageRecords();

    // 添加新记录
    records.push(newRecord);

    // 保存记录
    const success = await saveUsageRecords(records);

    if (success) {
      return NextResponse.json({
        success: true,
        message: "使用记录已保存",
        record: newRecord,
      });
    } else {
      return NextResponse.json(
        { success: false, error: "保存失败" },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "服务器错误" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const records = await getUsageRecords();
  return NextResponse.json({
    success: true,
    records,
    dataUrl: `https://jsonbin.io/${getBinId()}`,
  });
}
