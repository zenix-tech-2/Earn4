import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  if (!supabase) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to claim a video reward.' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { sessionId?: string }
  if (!body.sessionId) return NextResponse.json({ error: 'A video session is required.' }, { status: 400 })

  const { data, error } = await supabase.rpc('complete_video_watch_session', { p_session_id: body.sessionId })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ reward: Array.isArray(data) ? data[0] : data })
}
