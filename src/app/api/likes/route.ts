import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: NextRequest) {
  const client = getSupabaseClient();
  const searchParams = request.nextUrl.searchParams;
  const pageKey = searchParams.get('page_key') || 'homepage';

  try {
    // 查询点赞数
    const { data, error } = await client
      .from('page_likes')
      .select('like_count')
      .eq('page_key', pageKey)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 如果没有记录，返回0
    const likeCount = data?.like_count || 0;
    return NextResponse.json({ success: true, like_count: likeCount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const client = getSupabaseClient();
  
  try {
    const body = await request.json();
    const pageKey = body.page_key || 'homepage';

    // 先查询是否存在记录
    const { data: existingData, error: selectError } = await client
      .from('page_likes')
      .select('id, like_count')
      .eq('page_key', pageKey)
      .maybeSingle();

    if (selectError) {
      return NextResponse.json({ error: selectError.message }, { status: 500 });
    }

    if (existingData) {
      // 更新点赞数 +1
      const { data, error } = await client
        .from('page_likes')
        .update({ 
          like_count: existingData.like_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('page_key', pageKey)
        .select('like_count')
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, like_count: data.like_count });
    } else {
      // 插入新记录
      const { data, error } = await client
        .from('page_likes')
        .insert({ 
          page_key: pageKey, 
          like_count: 1,
          updated_at: new Date().toISOString()
        })
        .select('like_count')
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, like_count: data.like_count });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
