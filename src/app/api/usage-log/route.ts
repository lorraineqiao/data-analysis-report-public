import { NextRequest, NextResponse } from "next/server";

const JSONBIN_URL = "https://api.jsonbin.io/v3/b/";
const BIN_ID = "67f8c8e8ace6af77a9e2b456"; // 公共bin，用于读取
const MASTER_KEY = "$2a$10$Evo9xGqQZQZQZQZQZQZQZO"; // 需要替换为你的JSONBin master key

interface UsageRecord {
  date: string;
  agentName: string;
  channelManager: string;
  summary: string;
  screenshotUrl: string;
}

// 获取所有使用记录
async function getUsageRecords(): Promise<UsageRecord[]> {
  try {
    const response = await fetch(`${JSONBIN_URL}${BIN_ID}/latest`, {
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
    const response = await fetch(`${JSONBIN_URL}${BIN_ID}`, {
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

    if (!agentName || !channelManager) {
      return NextResponse.json(
        { error: "代理商名称和渠道经理不能为空" },
        { status: 400 }
      );
    }

    // 获取现有记录
    const records = await getUsageRecords();

    // 添加新记录
    const newRecord: UsageRecord = {
      date: new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
      agentName,
      channelManager,
      summary: summary || "",
      screenshotUrl: screenshotUrl || "",
    };

    records.push(newRecord);

    // 保存记录
    const success = await saveUsageRecords(records);

    if (!success) {
      // 如果保存失败，尝试创建新的bin
      return NextResponse.json(
        { error: "保存失败，请稍后重试" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      recordCount: records.length,
      message: `记录已保存，当前共有 ${records.length} 条使用记录`,
    });
  } catch (error) {
    console.error("保存使用记录失败:", error);
    return NextResponse.json(
      { error: "保存使用记录失败" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const records = await getUsageRecords();
    return NextResponse.json({
      success: true,
      records,
      count: records.length,
    });
  } catch (error) {
    console.error("获取使用记录失败:", error);
    return NextResponse.json({
      success: true,
      records: [],
      count: 0,
    });
  }
}
