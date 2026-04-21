import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { imageData, filename } = await request.json();
    
    if (!imageData) {
      return NextResponse.json({ success: false, error: '没有图片数据' }, { status: 400 });
    }
    
    // 生成文件名
    const timestamp = Date.now();
    const name = filename || `screenshot_${timestamp}.png`;
    
    // 上传到对象存储
    const uploadResponse = await fetch('https://internal.coze.dev/api/oss/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: name,
        content: imageData,
        contentType: 'image/png',
      }),
    });
    
    if (uploadResponse.ok) {
      const data = await uploadResponse.json();
      if (data.url) {
        console.log('Screenshot uploaded:', data.url);
        return NextResponse.json({ success: true, url: data.url });
      }
    }
    
    // 如果上传失败，返回base64数据
    console.log('Upload failed, returning base64');
    return NextResponse.json({ 
      success: true, 
      base64: imageData,
      message: '截图已生成，请右键保存' 
    });
    
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ success: false, error: '上传失败' }, { status: 500 });
  }
}
