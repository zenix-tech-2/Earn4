import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { isSupportedRewardVideoUrl } from '@/lib/video-url'

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  if (!supabase) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to start a video reward.' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { campaignId?: string }
  if (!body.campaignId) return NextResponse.json({ error: 'A video campaign is required.' }, { status: 400 })

  const { data: campaign } = await supabase.from('video_campaigns').select('video_url').eq('id', body.campaignId).eq('is_active', true).maybeSingle()
  if (!campaign || !isSupportedRewardVideoUrl(campaign.video_url)) {
    return NextResponse.json({ error: 'This campaign does not have a supported video URL.' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('start_video_watch_session', { p_campaign_id: body.campaignId })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ session: Array.isArray(data) ? data[0] : data })
}
