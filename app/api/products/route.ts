import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const supabase = await getSupabaseServerClient()
  if (!supabase) return NextResponse.json({ products: [], configured: false, schemaReady: false })

  const url = new URL(request.url)
  const category = url.searchParams.get('category')
  const search = url.searchParams.get('q')?.trim()
  let query = supabase
    .from('products')
    .select('id,title,description,category,icon,platform,is_free,price,currency,image_url,is_featured,created_at')
    .eq('is_active', true)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })

  if (category && category !== 'all') query = query.eq('category', category)
  if (search) query = query.ilike('title', `%${search.replace(/[%_]/g, '')}%`)

  const { data, error } = await query.limit(60)
  if (error) {
    return NextResponse.json({ products: [], configured: true, schemaReady: false })
  }

  return NextResponse.json({ products: data ?? [], configured: true, schemaReady: true })
}
