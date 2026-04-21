import { NextRequest, NextResponse } from 'next/server';
import { HeaderUtils, FetchClient, Config } from 'coze-coding-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: '请提供飞书表格链接' }, { status: 400 });
    }

    // 验证是否是飞书链接
    if (!url.includes('larkoffice.com') && !url.includes('feishu.cn')) {
      return NextResponse.json({ error: '仅支持飞书表格链接' }, { status: 400 });
    }

    // 尝试获取飞书表格导出链接
    // 飞书表格导出会生成一个可下载的Excel文件
    const exportUrl = generateExportUrl(url);
    
    if (!exportUrl) {
      return NextResponse.json({ 
        error: '无法解析该链接，请确保：\n1. 链接来自飞书表格\n2. 表格已开启分享权限\n3. 或尝试将表格导出为Excel后重新上传' 
      }, { status: 400 });
    }

    // 使用 FetchClient 获取导出的Excel
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new FetchClient(config, customHeaders);

    const response = await client.fetch(exportUrl);

    if (response.status_code !== 0) {
      return NextResponse.json({ 
        error: '获取飞书数据失败，请确保表格已开启分享权限' 
      }, { status: 500 });
    }

    // 检查是否是Excel文件
    const contentType = response.filetype || '';
    if (!contentType.includes('excel') && !contentType.includes('spreadsheet') && !contentType.includes('sheet')) {
      return NextResponse.json({ 
        error: '该链接不支持导出为Excel，请手动导出后上传' 
      }, { status: 400 });
    }

    // 解析内容
    const dataPreview = parseSheetContent(response.content);
    
    return NextResponse.json({
      success: true,
      dataPreview,
      fileName: response.title || '飞书表格',
    });
  } catch (err: any) {
    console.error('Lark API error:', err);
    return NextResponse.json({ 
      error: '获取飞书数据失败，请确保链接正确且表格已开启分享权限' 
    }, { status: 500 });
  }
}

// 生成飞书表格导出链接
function generateExportUrl(larkUrl: string): string | null {
  try {
    // 从分享链接提取信息
    const urlObj = new URL(larkUrl);
    const pathParts = urlObj.pathname.split('/');
    
    // 查找 sheet 和 table 参数
    const sheetId = urlObj.searchParams.get('sheet');
    const tableId = urlObj.searchParams.get('table');
    
    // 如果是飞书文档格式
    if (larkUrl.includes('/sheets/')) {
      // 尝试构建导出API URL
      // 注意：完整实现需要飞书开放平台API，这里提供一个简化的方法
      return larkUrl;
    }
    
    return larkUrl;
  } catch (err) {
    console.error('URL parse error:', err);
    return null;
  }
}

// 解析表格内容
function parseSheetContent(content: any[]): any[] {
  if (!content || !Array.isArray(content)) {
    return [];
  }

  const data: any[] = [];
  
  for (const item of content) {
    if (item.type === 'text' && item.text) {
      // 尝试解析为表格数据
      const lines = item.text.split('\n');
      for (const line of lines) {
        if (line.includes('|')) {
          // 可能是markdown表格格式
          const cells = line.split('|').filter((c: string) => c.trim());
          if (cells.length > 1 && !line.includes('---')) {
            data.push(cells.map((c: string) => c.trim()));
          }
        }
      }
    }
  }
  
  return data;
}
