import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await getSupabaseServerClient()
  if (!supabase) return NextResponse.json({ orders: [], configured: false })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to view purchases.' }, { status: 401 })

  const { data, error } = await supabase
    .from('store_orders')
    .select('id,order_number,status,currency,total,created_at,store_order_items(title_snapshot,quantity)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) return NextResponse.json({ orders: [], schemaReady: false })
  return NextResponse.json({ orders: data ?? [], schemaReady: true })
}
