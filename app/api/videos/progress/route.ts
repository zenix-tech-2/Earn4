import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  if (!supabase) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to record video progress.' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as {
    sessionId?: string
    positionSeconds?: number
    isPlaying?: boolean
    ended?: boolean
  }
  if (!body.sessionId || typeof body.positionSeconds !== 'number' || !Number.isFinite(body.positionSeconds) || body.positionSeconds < 0 || body.positionSeconds > 86400) {
    return NextResponse.json({ error: 'Valid session progress is required.' }, { status: 400 })
  }
  if (typeof body.isPlaying !== 'boolean' || (body.ended !== undefined && typeof body.ended !== 'boolean')) {
    return NextResponse.json({ error: 'Invalid playback state.' }, { status: 400 })
  }
  if (body.ended && body.isPlaying) {
    return NextResponse.json({ error: 'Ended playback cannot be marked as playing.' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('record_video_watch_progress', {
    p_session_id: body.sessionId,
    p_position_seconds: body.positionSeconds,
    p_is_playing: body.isPlaying,
    p_ended: body.ended ?? false,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  const progress = Array.isArray(data) ? data[0] : data
  return NextResponse.json({ progress })
}
