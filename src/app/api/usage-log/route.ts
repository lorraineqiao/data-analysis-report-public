import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action_type, data_summary, request_params } = body

    // 获取IP和User-Agent
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    const { error } = await supabase.from('usage_logs').insert({
      ip_address: ip,
      user_agent: userAgent,
      action_type: action_type || 'page_view',
      data_summary: data_summary || null,
      request_params: request_params || null,
    })

    if (error) {
      console.error('Failed to log usage:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Usage log error:', err)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}

// GET: 查询使用记录（仅管理员）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    const { data, error, count } = await supabase
      .from('usage_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data,
      total: count,
      limit,
      offset
    })
  } catch (err) {
    console.error('Usage log query error:', err)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}
