import { NextRequest, NextResponse } from 'next/server';
import { FetchClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: '请提供URL' }, { status: 400 });
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new FetchClient(config, customHeaders);

    const response = await client.fetch(url);

    if (response.status_code !== 0) {
      return NextResponse.json({ 
        error: '获取文档失败', 
        status_message: response.status_message 
      }, { status: 500 });
    }

    // 提取所有图片
    const images = response.content
      .filter(item => item.type === 'image')
      .map((item, index) => ({
        index: index + 1,
        url: item.image?.display_url,
        thumbnail: item.image?.thumbnail_display_url,
        width: item.image?.width,
        height: item.image?.height,
      }));

    // 提取所有文本
    const texts = response.content
      .filter(item => item.type === 'text')
      .map(item => item.text)
      .join('\n');

    return NextResponse.json({
      success: true,
      title: response.title,
      content: response.content,
      images,
      texts,
    });
  } catch (err: any) {
    console.error('Fetch error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
