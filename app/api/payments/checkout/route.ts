import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function GET() {
  // Credentials alone are not enough: a provider-specific checkout + signed webhook adapter
  // must be implemented and verified before we tell the UI that payments are enabled.
  return NextResponse.json({
    configured: false,
    provider: process.env.PAYMENT_PROVIDER || 'paylinky',
    awaitingAdapter: true,
  })
}

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  if (!supabase) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in before making a payment.' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { productId?: string; amount?: number; currency?: string }
  if (!body.productId && (!Number.isFinite(body.amount) || Number(body.amount) <= 0)) {
    return NextResponse.json({ error: 'Choose a product or enter a valid top-up amount.' }, { status: 400 })
  }

  // Never mark a payment as successful from the browser. The selected provider's
  // documented checkout and signature verification will be plugged in here.
  return NextResponse.json({ error: 'PayLinky checkout is not enabled until its official API and signed-webhook integration is implemented.' }, { status: 503 })
}
