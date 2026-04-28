import { NextRequest, NextResponse } from "next/server";

const JSONBIN_BASE_URL = "https://api.jsonbin.io/v3/b/";
// 使用用户创建的Bin
const DEFAULT_BIN_ID = "69ef40c636566621a8f8198d";

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
    const response = await fetch(`${JSONBIN_BASE_URL}${binId}/latest`);
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
async function saveUsageRecords(records: UsageRecord[]): Promise<{success: boolean; response?: any}> {
  try {
    const binId = getBinId();
    const url = `${JSONBIN_BASE_URL}${binId}`;
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ records }),
    });
    
    if (!response.ok) {
      const text = await response.text();
      console.error('JSONBin PUT failed:', response.status, text);
      return { success: false, response: { status: response.status, text } };
    }
    
    return { success: true };
  } catch (error) {
    console.error('JSONBin PUT error:', error);
    return { success: false, response: String(error) };
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

    console.log('Usage record received:', newRecord);

    // 获取现有记录
    const records = await getUsageRecords();

    // 添加新记录
    records.push(newRecord);

    // 保存记录
    const result = await saveUsageRecords(records);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "使用记录已保存",
        record: newRecord,
      });
    } else {
      return NextResponse.json(
        { success: false, error: "保存失败", details: result.response },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Usage log error:', error);
    return NextResponse.json(
      { success: false, error: "服务器错误", details: String(error) },
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
