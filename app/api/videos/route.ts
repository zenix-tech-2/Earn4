import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await getSupabaseServerClient()
  if (!supabase) return NextResponse.json({ videos: [], configured: false })

  const { data, error } = await supabase
    .from('video_campaigns')
    .select('id,title,description,video_url,thumbnail_url,reward_amount,currency,duration_seconds')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ videos: [], configured: true, schemaReady: false })
  return NextResponse.json({ videos: data ?? [], configured: true, schemaReady: true })
}
