import { NextRequest, NextResponse } from 'next/server';

// 飞书应用配置
const LARK_APP_ID = process.env.LARK_APP_ID || '';
const LARK_APP_SECRET = process.env.LARK_APP_SECRET || '';
const LARK_TABLE_TOKEN = process.env.LARK_TABLE_TOKEN || '';

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

// 获取sheet ID
async function getSheetId(token: string): Promise<string | null> {
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
      console.log('Found sheet ID:', sheetData.data.sheets[0].sheet_id);
      return sheetData.data.sheets[0].sheet_id;
    }
    console.error('Sheet ID error:', sheetData);
    return null;
  } catch (err) {
    console.error('Get sheet ID error:', err);
    return null;
  }
}

// 获取表格数据确定下一行
async function getNextRow(token: string, sheetId: string): Promise<number> {
  try {
    // 获取更多行来确保找到最后一行
    const response = await fetch(
      `https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/${LARK_TABLE_TOKEN}/values/${sheetId}!A1:A100`,
      {
        headers: { 'Authorization': `Bearer ${token}` },
      }
    );
    
    const data = await response.json();
    
    if (data.code === 0 && data.data?.valueRange?.values) {
      const values = data.data.valueRange.values;
      console.log('Current values length:', values.length);
      console.log('Values:', JSON.stringify(values).substring(0, 500));
      
      // 从后往前找，找到第一个有数据的行
      for (let i = values.length - 1; i >= 0; i--) {
        const row = values[i];
        // 检查这行是否有任何非空数据
        const hasData = row && row.some((cell: unknown) => cell !== null && cell !== '');
        if (hasData) {
          console.log(`Found last row with data at index ${i}, returning row ${i + 2}`);
          return i + 2; // 下一行（+1是索引转行号，+1是下一行）
        }
      }
      // 如果全是空的，返回第2行（第一行是表头）
      console.log('No data found, returning row 2');
      return 2;
    }
    
    console.log('No values found, returning row 2');
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
    
    console.log('Using sheet ID:', sheetId);
    
    // 获取下一行行号
    const nextRow = await getNextRow(token, sheetId);
    console.log(`Writing to row ${nextRow}`);
    
    // 写入新数据 - 使用追加API
    const writeUrl = `https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/${LARK_TABLE_TOKEN}/values_append`;
    
    const writeResponse = await fetch(writeUrl, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueRange: {
          range: `${sheetId}!A${nextRow}`,
          values: [[
            record.访问时间,
            record.IP地址 || '',
            record.浏览器信息 || '',
            record.代理商名称 || '',
            record.渠道经理 || '',
            record.操作类型 || '',
            record.数据摘要 || '',
          ]],
        },
      }),
    });
    
    const result = await writeResponse.json();
    console.log('Write result:', JSON.stringify(result));
    
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
    
    // 获取飞书 Access Token
    const token = await getLarkAccessToken();
    if (!token) {
      return NextResponse.json({ success: false, error: 'Failed to get access token' }, { status: 500 });
    }
    
    // 构建记录
    const record: Record<string, string> = {
      访问时间: body.访问时间 || new Date().toLocaleString('zh-CN'),
      IP地址: body.IP地址 || '',
      浏览器信息: body.浏览器信息 || '',
      代理商名称: body.代理商名称 || '',
      渠道经理: body.渠道经理 || '',
      操作类型: body.操作类型 || '',
      数据摘要: body.数据摘要 || '',
    };
    
    console.log('Record to write:', JSON.stringify(record));
    
    // 追加到飞书表格
    const success = await appendToLarkTable(token, record);
    
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: 'Failed to write to Lark' }, { status: 500 });
    }
  } catch (err) {
    console.error('Error:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    message: 'Lark usage log API is running',
    tableToken: LARK_TABLE_TOKEN ? 'configured' : 'not configured',
  });
}
