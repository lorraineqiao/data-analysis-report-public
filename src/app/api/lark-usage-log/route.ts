import { NextRequest, NextResponse } from 'next/server';

// 飞书应用配置
const LARK_APP_ID = process.env.LARK_APP_ID || '';
const LARK_APP_SECRET = process.env.LARK_APP_SECRET || '';
const LARK_TABLE_TOKEN = process.env.LARK_TABLE_TOKEN || '';

let cachedSheetId: string | null = '14b3eb'; // 预填充sheetId
let cachedToken: string | null = null;
let tokenExpireTime: number = 0;

// 获取飞书 Access Token（带缓存）
async function getLarkAccessToken(): Promise<string | null> {
  // 检查缓存是否有效
  if (cachedToken && Date.now() < tokenExpireTime) {
    return cachedToken;
  }
  
  try {
    const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: LARK_APP_ID,
        app_secret: LARK_APP_SECRET,
      }),
    });

    const data = await response.json();
    if (data.code === 0 && data.tenant_access_token) {
      cachedToken = data.tenant_access_token;
      // token有效期20分钟，提前5分钟过期
      tokenExpireTime = Date.now() + (data.expire_in - 300) * 1000;
      return cachedToken;
    }
    return null;
  } catch {
    return null;
  }
}

// 获取sheet ID（带缓存）
async function getSheetId(token: string): Promise<string | null> {
  if (cachedSheetId) return cachedSheetId;
  
  try {
    const sheetResponse = await fetch(
      `https://open.feishu.cn/open-apis/sheets/v3/spreadsheets/${LARK_TABLE_TOKEN}/sheets/query`,
      {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    const sheetData = await sheetResponse.json();
    
    if (sheetData.code === 0 && sheetData.data?.sheets?.[0]?.sheet_id) {
      cachedSheetId = sheetData.data.sheets[0].sheet_id;
      return cachedSheetId;
    }
    return null;
  } catch {
    return null;
  }
}

// 获取表格数据确定下一行
async function getNextRow(token: string, sheetId: string): Promise<number> {
  try {
    const response = await fetch(
      `https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/${LARK_TABLE_TOKEN}/values/${sheetId}!A1:A100`,
      {
        headers: { 'Authorization': `Bearer ${token}` },
      }
    );
    
    const text = await response.text();
    console.log('Get row response:', text.substring(0, 200));
    
    const data = JSON.parse(text);
    
    if (data.code === 0 && data.data?.valueRange?.values) {
      const values = data.data.valueRange.values;
      // 找到最后一行有数据的行
      let lastRow = 1;
      for (let i = values.length - 1; i >= 0; i--) {
        if (values[i] && values[i].length > 0 && values[i][0] !== null) {
          lastRow = i + 1;
          break;
        }
        if (i === 0) {
          lastRow = 1;
        }
      }
      console.log('Last data row:', lastRow);
      return lastRow + 1;
    }
    
    return 2;
  } catch (err) {
    console.error('Get row count error:', err);
    return 2;
  }
}

// 追加数据到飞书表格
async function appendToLarkTable(token: string, record: Record<string, string>) {
  try {
    const sheetId = await getSheetId(token);
    if (!sheetId) {
      console.error('Cannot get sheet ID');
      return false;
    }
    
    // 获取下一行行号
    const nextRow = await getNextRow(token, sheetId);
    console.log(`Writing to row ${nextRow}`);
    
    // 写入新数据
    const writeResponse = await fetch(
      `https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/${LARK_TABLE_TOKEN}/values_batch_update`,
      {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          valueRanges: [
            {
              range: `${sheetId}!A${nextRow}:G${nextRow}`,
              values: [[
                record.访问时间,
                record.IP地址,
                record.浏览器信息,
                record.代理商名称,
                record.渠道经理,
                record.操作类型,
                record.数据摘要,
              ]],
            },
          ],
        }),
      }
    );
    
    const result = await writeResponse.json();
    if (result.code === 0) {
      console.log(`Written to row ${nextRow} successfully`);
      return true;
    }
    
    console.error('Write error:', result);
    return false;
  } catch (err) {
    console.error('Lark API error:', err);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action_type, data_summary, userInfo } = body;

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const record: Record<string, string> = {
      访问时间: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
      IP地址: ip,
      浏览器信息: userAgent.substring(0, 200),
      代理商名称: userInfo?.agentName || '',
      渠道经理: userInfo?.managerName || '',
      操作类型: action_type === 'page_view' ? '页面访问' : '数据生成',
      数据摘要: data_summary ? JSON.stringify(data_summary) : '',
    };

    console.log('Usage record:', record);

    if (LARK_APP_ID && LARK_APP_SECRET && LARK_TABLE_TOKEN) {
      const token = await getLarkAccessToken();
      if (token) {
        const success = await appendToLarkTable(token, record);
        console.log('Write result:', success);
      }
    } else {
      console.log('Lark not configured');
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Usage log error:', err);
    return NextResponse.json({ success: false, error: '记录失败' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!LARK_APP_ID || !LARK_APP_SECRET || !LARK_TABLE_TOKEN) {
      return NextResponse.json({ success: false, error: '未配置' }, { status: 400 });
    }

    const token = await getLarkAccessToken();
    if (!token) {
      return NextResponse.json({ success: false, error: '获取Token失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: [] });
  } catch (err) {
    return NextResponse.json({ success: false, error: '查询失败' }, { status: 500 });
  }
}
