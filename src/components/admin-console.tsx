'use client'

import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowLeft, ArrowRight, Check, Film, Loader2, Package, Plus, ShieldCheck, Sparkles } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser'
import { isSupportedRewardVideoUrl } from '@/lib/video-url'

type ProductRow = { id: string; title: string; category: string | null; price: number; currency: string; is_active: boolean; is_featured: boolean }
type VideoRow = { id: string; title: string; reward_amount: number; currency: string; duration_seconds: number; is_active: boolean }

export default function AdminConsole() {
  const supabase = getSupabaseBrowserClient()
  const [status, setStatus] = useState<'loading' | 'unauthenticated' | 'forbidden' | 'ready' | 'not-configured'>('loading')
  const [products, setProducts] = useState<ProductRow[]>([])
  const [videos, setVideos] = useState<VideoRow[]>([])
  const [activeForm, setActiveForm] = useState<'product' | 'video'>('product')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [productForm, setProductForm] = useState({ title: '', description: '', category: 'digital-products', price: '', currency: 'XAF', image_url: '' })
  const [videoForm, setVideoForm] = useState({ title: '', description: '', video_url: '', thumbnail_url: '', reward_amount: '', currency: 'XAF', duration_seconds: '30', daily_limit: '3' })

  const loadDashboard = async () => {
    if (!supabase) { setStatus('not-configured'); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setStatus('unauthenticated'); return }
    const { data: profile, error: profileError } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
    if (profileError || !profile?.is_admin) { setStatus('forbidden'); return }
    const [{ data: productRows }, { data: videoRows }] = await Promise.all([
      supabase.from('products').select('id,title,category,price,currency,is_active,is_featured').order('created_at', { ascending: false }).limit(50),
      supabase.from('video_campaigns').select('id,title,reward_amount,currency,duration_seconds,is_active').order('created_at', { ascending: false }).limit(50),
    ])
    setProducts((productRows ?? []) as ProductRow[])
    setVideos((videoRows ?? []) as VideoRow[])
    setStatus('ready')
  }

  useEffect(() => { void loadDashboard() }, [])

  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) return
    setSaving(true)
    setMessage('')
    const price = Number(productForm.price || 0)
    const { error } = await supabase.from('products').insert({
      title: productForm.title.trim(), description: productForm.description.trim(), category: productForm.category,
      icon: 'package', is_free: price <= 0, price, currency: productForm.currency,
      image_url: productForm.image_url.trim() || null, is_active: true, is_featured: false, product_type: 'digital',
    })
    setSaving(false)
    if (error) { setMessage(error.message); return }
    setProductForm({ title: '', description: '', category: 'digital-products', price: '', currency: 'XAF', image_url: '' })
    setMessage('Product added to the store.')
    await loadDashboard()
  }

  const saveVideo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) return
    if (!isSupportedRewardVideoUrl(videoForm.video_url.trim())) {
      setMessage('Use a direct MP4, WebM, or Ogg URL, or an embeddable YouTube or Vimeo link over HTTPS.')
      return
    }
    setSaving(true)
    setMessage('')
    const { error } = await supabase.from('video_campaigns').insert({
      title: videoForm.title.trim(), description: videoForm.description.trim(), video_url: videoForm.video_url.trim(),
      thumbnail_url: videoForm.thumbnail_url.trim() || null, reward_amount: Number(videoForm.reward_amount),
      currency: videoForm.currency, duration_seconds: Number(videoForm.duration_seconds), daily_limit: Number(videoForm.daily_limit), is_active: true,
    })
    setSaving(false)
    if (error) { setMessage(error.message); return }
    setVideoForm({ title: '', description: '', video_url: '', thumbnail_url: '', reward_amount: '', currency: 'XAF', duration_seconds: '30', daily_limit: '3' })
    setMessage('Video reward campaign created.')
    await loadDashboard()
  }

  const toggleProduct = async (row: ProductRow) => {
    if (!supabase) return
    const { error } = await supabase.from('products').update({ is_active: !row.is_active }).eq('id', row.id)
    if (error) setMessage(error.message)
    else await loadDashboard()
  }

  const toggleVideo = async (row: VideoRow) => {
    if (!supabase) return
    const { error } = await supabase.from('video_campaigns').update({ is_active: !row.is_active }).eq('id', row.id)
    if (error) setMessage(error.message)
    else await loadDashboard()
  }

  if (status === 'loading') return <div className="admin-gate"><Loader2 className="spinner-icon" size={27} />Checking admin access…</div>
  if (status === 'not-configured') return <div className="admin-gate"><ShieldCheck size={30} /><h1>Admin access needs setup</h1><p>Add Supabase project settings to <code>.env.local</code>, then restart Next.js.</p><a href="/">Back to EARNIZI <ArrowRight size={16} /></a></div>
  if (status === 'unauthenticated') return <div className="admin-gate"><ShieldCheck size={30} /><h1>Sign in to continue</h1><p>Admin tools are available to authorized EARNIZI administrators.</p><a href="/">Return home <ArrowRight size={16} /></a></div>
  if (status === 'forbidden') return <div className="admin-gate"><ShieldCheck size={30} /><h1>Admin access required</h1><p>This account does not have EARNIZI administrator permissions.</p><a href="/">Return home <ArrowRight size={16} /></a></div>

  return (
    <main className="admin-page">
      <header className="admin-topbar"><a href="/" className="admin-back"><ArrowLeft size={17} /> Back to EARNIZI</a><span><ShieldCheck size={16} /> ADMIN CONSOLE</span></header>
      <section className="admin-welcome"><p className="eyebrow">EARNIZI MANAGEMENT</p><h1>Store & video rewards</h1><p>Manage the digital catalog and the video-only earning campaigns.</p></section>
      <div className="admin-stats"><article><span><Package size={20} /></span><div><strong>{products.length}</strong><small>Catalog products</small></div></article><article><span><Film size={20} /></span><div><strong>{videos.length}</strong><small>Video campaigns</small></div></article></div>
      <div className="admin-tabs"><button className={activeForm === 'product' ? 'selected' : ''} onClick={() => { setActiveForm('product'); setMessage('') }}><Package size={17} />Products</button><button className={activeForm === 'video' ? 'selected' : ''} onClick={() => { setActiveForm('video'); setMessage('') }}><Film size={17} />Video rewards</button></div>
      {activeForm === 'product' ? (
        <section className="admin-panel"><div className="admin-panel-title"><span><Package size={19} /></span><div><h2>Add a product</h2><p>New products are listed in the EARNIZI store.</p></div></div><form className="admin-form" onSubmit={saveProduct}><label>Product name<input required value={productForm.title} onChange={(event) => setProductForm({ ...productForm, title: event.target.value })} placeholder="e.g. Premium app access" /></label><label>Description<textarea value={productForm.description} onChange={(event) => setProductForm({ ...productForm, description: event.target.value })} placeholder="What should customers know?" rows={3} /></label><div className="admin-form-row"><label>Category<select value={productForm.category} onChange={(event) => setProductForm({ ...productForm, category: event.target.value })}>{[['virtual-numbers','Virtual Numbers'],['social-media','Social Media Accounts'],['residential-proxies','Residential Proxies'],['premium-apps','Premium Apps'],['subscriptions','Pro Accounts & Subscriptions'],['digital-products','Digital Products']].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Price<input min="0" step="0.01" type="number" value={productForm.price} onChange={(event) => setProductForm({ ...productForm, price: event.target.value })} placeholder="0 for free" /></label></div><div className="admin-form-row"><label>Currency<input maxLength={3} value={productForm.currency} onChange={(event) => setProductForm({ ...productForm, currency: event.target.value.toUpperCase() })} /></label><label>Image URL<input type="url" value={productForm.image_url} onChange={(event) => setProductForm({ ...productForm, image_url: event.target.value })} placeholder="https://…" /></label></div><button className="admin-submit" disabled={saving}>{saving ? <Loader2 size={16} className="spinner-icon" /> : <Plus size={17} />}Add product <ArrowRight size={16} /></button></form></section>
      ) : (
        <section className="admin-panel"><div className="admin-panel-title"><span className="video-panel-icon"><Film size={19} /></span><div><h2>Create a video reward</h2><p>Videos are the only reward activity. No game campaigns are supported.</p></div></div><form className="admin-form" onSubmit={saveVideo}><label>Campaign title<input required value={videoForm.title} onChange={(event) => setVideoForm({ ...videoForm, title: event.target.value })} placeholder="e.g. Daily spotlight" /></label><label>Description<textarea value={videoForm.description} onChange={(event) => setVideoForm({ ...videoForm, description: event.target.value })} placeholder="Describe this video" rows={2} /></label><label>Video URL<input required type="url" value={videoForm.video_url} onChange={(event) => setVideoForm({ ...videoForm, video_url: event.target.value })} placeholder="https://example.com/video.mp4" /></label><p className="admin-form-hint">Supports MP4, WebM, Ogg, YouTube, and Vimeo links over HTTPS.</p><label>Thumbnail URL<input type="url" value={videoForm.thumbnail_url} onChange={(event) => setVideoForm({ ...videoForm, thumbnail_url: event.target.value })} placeholder="https://…/thumbnail.jpg" /></label><div className="admin-form-row"><label>Reward<input required min="0.01" step="0.01" type="number" value={videoForm.reward_amount} onChange={(event) => setVideoForm({ ...videoForm, reward_amount: event.target.value })} /></label><label>Currency<input maxLength={3} value={videoForm.currency} onChange={(event) => setVideoForm({ ...videoForm, currency: event.target.value.toUpperCase() })} /></label></div><div className="admin-form-row"><label>Required watch time (seconds)<input required min="5" max="3600" type="number" value={videoForm.duration_seconds} onChange={(event) => setVideoForm({ ...videoForm, duration_seconds: event.target.value })} /></label><label>Daily watch limit<input required min="1" max="100" type="number" value={videoForm.daily_limit} onChange={(event) => setVideoForm({ ...videoForm, daily_limit: event.target.value })} /></label></div><button className="admin-submit" disabled={saving}>{saving ? <Loader2 size={16} className="spinner-icon" /> : <Plus size={17} />}Create video campaign <ArrowRight size={16} /></button></form></section>
      )}
      {message && <div className="admin-feedback"><Check size={15} />{message}</div>}
      {activeForm === 'product' ? <section className="admin-list"><div className="admin-list-heading"><h2>Products</h2><span>{products.length} total</span></div>{products.length === 0 ? <p className="admin-empty">No products yet. Add your first one above.</p> : products.map((row) => <article key={row.id} className="admin-list-row"><span className="admin-row-icon"><Sparkles size={17} /></span><div><strong>{row.title}</strong><small>{row.category || 'Uncategorized'} · {row.currency} {Number(row.price || 0).toLocaleString()}</small></div><button className={row.is_active ? 'status-toggle on' : 'status-toggle'} onClick={() => void toggleProduct(row)}>{row.is_active ? 'Live' : 'Hidden'}</button></article>)}</section> : <section className="admin-list"><div className="admin-list-heading"><h2>Video campaigns</h2><span>{videos.length} total</span></div>{videos.length === 0 ? <p className="admin-empty">No videos yet. Add a video reward above.</p> : videos.map((row) => <article key={row.id} className="admin-list-row"><span className="admin-row-icon video-row-icon"><Film size={17} /></span><div><strong>{row.title}</strong><small>{row.currency} {Number(row.reward_amount).toLocaleString()} · {row.duration_seconds}s watch</small></div><button className={row.is_active ? 'status-toggle on' : 'status-toggle'} onClick={() => void toggleVideo(row)}>{row.is_active ? 'Live' : 'Hidden'}</button></article>)}</section>}
      <aside className="admin-payment-note"><ShieldCheck size={18} /><p><strong>Payments are protected.</strong> PayLinky checkout stays disabled until its official API and signed-webhook flow are verified and implemented.</p></aside>
    </main>
  )
}
