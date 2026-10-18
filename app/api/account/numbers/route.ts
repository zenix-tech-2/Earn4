import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await getSupabaseServerClient()
  if (!supabase) return NextResponse.json({ numbers: [], configured: false })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to view your numbers.' }, { status: 401 })

  const { data, error } = await supabase
    .from('virtual_number_requests')
    .select('id,country_code,service_name,status,phone_number,price,currency,expires_at,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) return NextResponse.json({ numbers: [], schemaReady: false })
  return NextResponse.json({ numbers: data ?? [], schemaReady: true })
}
