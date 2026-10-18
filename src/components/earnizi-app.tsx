'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  CreditCard,
  Film,
  Flame,
  Gift,
  Globe,
  Headphones,
  House,
  Camera,
  Layers,
  Music2,
  LockKeyhole,
  LogOut,
  Menu,
  MessageCircle,
  Package,
  PackageOpen,
  Play,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Star,
  TrendingUp,
  UserRound,
  Wallet,
  X,
  Zap,
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser'
import RewardVideoPlayer from '@/components/reward-video-player'

type Tab = 'home' | 'numbers' | 'store' | 'categories' | 'account'
type DialogName = 'notifications' | 'auth' | 'wallet' | 'videos' | 'support' | 'purchases' | null
type Product = {
  id: string
  title: string
  description: string | null
  category: string | null
  icon: string | null
  platform: string | null
  is_free: boolean
  price: number | null
  currency: string | null
  image_url: string | null
  is_featured: boolean
  created_at: string
}
type Profile = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  country: string | null
  currency: string | null
  balance: number | null
  total_earnings: number | null
  is_admin: boolean
}
type Video = {
  id: string
  title: string
  description: string | null
  video_url: string
  thumbnail_url: string | null
  reward_amount: number
  currency: string
  duration_seconds: number
}
type WatchSession = {
  session_id: string
  title: string
  video_url: string
  reward_amount: number
  currency: string
  duration_seconds: number
}
type Purchase = {
  id: string
  order_number: string
  status: string
  currency: string
  total: number
  created_at: string
  store_order_items?: { title_snapshot: string; quantity: number }[]
}
type NumberRequest = {
  id: string
  country_code: string
  service_name: string
  status: string
  phone_number: string | null
  price: number
  currency: string
  expires_at: string | null
  created_at: string
}
type ServiceCategory = {
  id: string
  title: string
  description: string
  kind: 'number' | 'social' | 'proxy' | 'premium' | 'subscription' | 'digital'
  color: string
  details: string
}

const serviceCategories: ServiceCategory[] = [
  { id: 'virtual-numbers', title: 'Virtual Numbers', description: 'Receive OTPs. Stay private.', kind: 'number', color: 'mint', details: 'Browse secure virtual numbers and OTP services for popular apps.' },
  { id: 'social-media', title: 'Social Media Accounts', description: 'Your social world, upgraded.', kind: 'social', color: 'lavender', details: 'Explore creator and business-ready social media accounts.' },
  { id: 'residential-proxies', title: 'Residential Proxies', description: 'Private, reliable connections.', kind: 'proxy', color: 'blue', details: 'Find residential IP options for safer browsing.' },
  { id: 'premium-apps', title: 'Premium Apps', description: 'More from your favorite apps.', kind: 'premium', color: 'peach', details: 'Discover premium app plans for entertainment and productivity.' },
  { id: 'subscriptions', title: 'Pro Accounts & Subscriptions', description: 'A better way to stream and create.', kind: 'subscription', color: 'aqua', details: 'Browse streaming and creator subscriptions in one place.' },
  { id: 'digital-products', title: 'Digital Products', description: 'Tools, templates, eBooks and more.', kind: 'digital', color: 'pink', details: 'Explore useful digital downloads for your next project.' },
]

const popularSearches = ['WhatsApp', 'Netflix', 'ChatGPT']
const benefits: { icon: LucideIcon; title: string; caption: string; color: string }[] = [
  { icon: ShieldCheck, title: 'Safe & secure', caption: 'Your privacy comes first', color: 'green' },
  { icon: Zap, title: 'Instant delivery', caption: 'Ready in just a few moments', color: 'purple' },
  { icon: Headphones, title: 'Here to help', caption: 'Friendly, reliable support', color: 'orange' },
  { icon: Globe, title: 'Worldwide access', caption: 'Numbers in 190+ countries', color: 'blue' },
]
const tabs: { id: Tab; title: string; icon: LucideIcon }[] = [
  { id: 'home', title: 'Home', icon: House },
  { id: 'numbers', title: 'Numbers', icon: Smartphone },
  { id: 'store', title: 'Store', icon: ShoppingBag },
  { id: 'categories', title: 'Categories', icon: Layers },
  { id: 'account', title: 'Account', icon: UserRound },
]

function BrandMark() {
  return <span className="brand-mark"><Smartphone size={39} strokeWidth={2.8} /><Check className="brand-mark-check" size={18} strokeWidth={3.4} /></span>
}

function ServiceArt({ kind }: { kind: ServiceCategory['kind'] }) {
  if (kind === 'number') return <div className="art-sim" aria-hidden="true"><span className="sim-notch" /><span className="sim-lines"><i /><i /><i /><i /></span><Smartphone size={24} /></div>
  if (kind === 'social') return <div className="art-social" aria-hidden="true"><b className="social-f">f</b><b className="social-t"><Music2 size={22} /></b><b className="social-i"><Camera size={22} /></b><b className="social-x">X</b></div>
  if (kind === 'proxy') return <div className="art-server" aria-hidden="true"><span /><span /><span /><ShieldCheck size={35} /></div>
  if (kind === 'premium') return <div className="art-premium" aria-hidden="true"><Star size={42} fill="currentColor" /><Sparkles size={17} /></div>
  if (kind === 'subscription') return <div className="art-subscriptions" aria-hidden="true"><b>N</b><span><Play size={19} fill="currentColor" /></span><i>+</i></div>
  return <div className="art-gift" aria-hidden="true"><Gift size={43} /><Sparkles size={16} /></div>
}

function Dialog({ title, children, onClose, eyebrow }: { title: string; children: ReactNode; onClose: () => void; eyebrow?: string }) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="modal-card" role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-header">
          <div>{eyebrow && <p className="modal-eyebrow">{eyebrow}</p>}<h2>{title}</h2></div>
          <button className="circle-button modal-close" onClick={onClose} aria-label="Close dialog"><X size={20} /></button>
        </header>
        <div className="modal-content">{children}</div>
      </section>
    </div>
  )
}

export default function EarniziApp() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [tab, setTab] = useState<Tab>('home')
  const [dialog, setDialog] = useState<DialogName>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' })
  const [authBusy, setAuthBusy] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [productsSchemaReady, setProductsSchemaReady] = useState(true)
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [purchasesLoaded, setPurchasesLoaded] = useState(false)
  const [numberRequests, setNumberRequests] = useState<NumberRequest[]>([])
  const [storeCategory, setStoreCategory] = useState('all')
  const [storeSearch, setStoreSearch] = useState('')
  const [sortOrder, setSortOrder] = useState('featured')
  const [sortOpen, setSortOpen] = useState(false)
  const [videos, setVideos] = useState<Video[]>([])
  const [videosLoaded, setVideosLoaded] = useState(false)
  const [videosConfigured, setVideosConfigured] = useState(true)
  const [watchSession, setWatchSession] = useState<WatchSession | null>(null)
  const watchProgressQueue = useRef<Promise<void>>(Promise.resolve())
  const [watchBusy, setWatchBusy] = useState(false)
  const [providerConfigured, setProviderConfigured] = useState(false)
  const [topUpAmount, setTopUpAmount] = useState('')
  const [toast, setToast] = useState('')
  const [unread, setUnread] = useState(3)

  const notify = useCallback((message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 3000)
  }, [])

  const refreshProfile = useCallback(async (userId: string) => {
    if (!supabase) return
    const { data } = await supabase.from('profiles').select('id,name,email,phone,country,currency,balance,total_earnings,is_admin').eq('id', userId).maybeSingle()
    if (data) setProfile(data as Profile)
  }, [supabase])

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session?.user) void refreshProfile(data.session.user.id)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (nextSession?.user) void refreshProfile(nextSession.user.id)
      else setProfile(null)
    })
    return () => listener.subscription.unsubscribe()
  }, [supabase, refreshProfile])

  useEffect(() => {
    if (tab !== 'numbers' || !session) return
    const controller = new AbortController()
    void fetch('/api/account/numbers', { signal: controller.signal }).then((response) => response.json()).then((result: { numbers?: NumberRequest[] }) => setNumberRequests(result.numbers ?? [])).catch(() => {})
    return () => controller.abort()
  }, [tab, session])

  useEffect(() => {
    if (tab !== 'account' || !session) return
    const controller = new AbortController()
    void fetch('/api/account/orders', { signal: controller.signal }).then((response) => response.json()).then((result: { orders?: Purchase[] }) => {
      setPurchases(result.orders ?? [])
      setPurchasesLoaded(true)
    }).catch(() => { if (!controller.signal.aborted) setPurchasesLoaded(true) })
    void fetch('/api/account/numbers', { signal: controller.signal }).then((response) => response.json()).then((result: { numbers?: NumberRequest[] }) => setNumberRequests(result.numbers ?? [])).catch(() => {})
    return () => controller.abort()
  }, [tab, session])

  useEffect(() => {
    if (dialog !== 'purchases' || !session || purchasesLoaded) return
    const controller = new AbortController()
    void fetch('/api/account/orders', { signal: controller.signal }).then((response) => response.json()).then((result: { orders?: Purchase[] }) => {
      setPurchases(result.orders ?? [])
      setPurchasesLoaded(true)
    }).catch(() => { if (!controller.signal.aborted) setPurchasesLoaded(true) })
    return () => controller.abort()
  }, [dialog, purchasesLoaded, session])

  useEffect(() => {
    if (tab !== 'store') return
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setProductsLoading(true)
      const params = new URLSearchParams()
      if (storeCategory !== 'all') params.set('category', storeCategory)
      if (storeSearch.trim()) params.set('q', storeSearch.trim())
      try {
        const response = await fetch(`/api/products?${params.toString()}`, { signal: controller.signal })
        const result = await response.json() as { products?: Product[]; schemaReady?: boolean }
        setProducts(result.products ?? [])
        setProductsSchemaReady(result.schemaReady !== false)
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setProducts([])
      } finally {
        if (!controller.signal.aborted) setProductsLoading(false)
      }
    }, 180)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [tab, storeCategory, storeSearch])

  useEffect(() => {
    void fetch('/api/payments/checkout').then((response) => response.json()).then((result: { configured?: boolean }) => setProviderConfigured(Boolean(result.configured))).catch(() => setProviderConfigured(false))
  }, [])

  useEffect(() => {
    if (dialog !== 'videos' || videosLoaded) return
    void fetch('/api/videos').then((response) => response.json()).then((result: { videos?: Video[]; configured?: boolean }) => {
      setVideos(result.videos ?? [])
      setVideosConfigured(result.configured !== false)
      setVideosLoaded(true)
    }).catch(() => { setVideos([]); setVideosLoaded(true) })
  }, [dialog, videosLoaded])

  useEffect(() => {
    const isOpen = drawerOpen || dialog !== null
    document.body.classList.toggle('overlay-open', isOpen)
    return () => document.body.classList.remove('overlay-open')
  }, [dialog, drawerOpen])

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setDialog(null); setDrawerOpen(false); setSortOpen(false) }
    }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [])

  const goTo = (nextTab: Tab) => {
    setTab(nextTab)
    setDrawerOpen(false)
    setDialog(null)
    setSortOpen(false)
    if (nextTab === 'store') { setStoreCategory('all'); setStoreSearch('') }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openAuth = (mode: 'login' | 'signup' = 'login') => {
    setAuthMode(mode)
    setDialog('auth')
    setDrawerOpen(false)
  }

  const submitAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) { notify('Add Supabase settings to .env.local to enable accounts.'); return }
    setAuthBusy(true)
    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: authForm.email, password: authForm.password })
        if (error) throw error
        setDialog(null)
        notify('Welcome back to EARNIZI.')
      } else {
        const { error } = await supabase.auth.signUp({ email: authForm.email, password: authForm.password, options: { data: { name: authForm.name } } })
        if (error) throw error
        setDialog(null)
        notify('Check your email to confirm your account.')
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not sign in. Please try again.')
    } finally {
      setAuthBusy(false)
    }
  }

  const signOut = async () => {
    await supabase?.auth.signOut()
    setDialog(null)
    setDrawerOpen(false)
    setProfile(null)
    setPurchases([])
    setPurchasesLoaded(false)
    setNumberRequests([])
    notify('You have signed out.')
  }

  const chooseService = (category: ServiceCategory) => {
    if (category.id === 'virtual-numbers') goTo('numbers')
    else {
      setStoreCategory(category.id)
      goTo('store')
      window.setTimeout(() => setStoreCategory(category.id), 0)
    }
  }

  const startVideo = async (video: Video) => {
    if (!session) { openAuth('login'); return }
    setWatchBusy(true)
    try {
      const response = await fetch('/api/videos/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaignId: video.id }) })
      const result = await response.json() as { session?: WatchSession; error?: string }
      if (!response.ok || !result.session) throw new Error(result.error || 'Could not start this video.')
      watchProgressQueue.current = Promise.resolve()
      setWatchSession(result.session)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Video reward is unavailable right now.')
    } finally {
      setWatchBusy(false)
    }
  }

  const recordVideoProgress = useCallback((positionSeconds: number, isPlaying: boolean, ended = false): Promise<boolean> => {
    const activeSession = watchSession
    if (!activeSession) return Promise.resolve(false)
    const request = watchProgressQueue.current.then(async () => {
      const response = await fetch('/api/videos/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: activeSession.session_id, positionSeconds, isPlaying, ended }),
      })
      const result = await response.json() as { progress?: { ready_to_complete?: boolean }; error?: string }
      if (!response.ok) throw new Error(result.error || 'Watch progress could not be verified.')
      return Boolean(result.progress?.ready_to_complete)
    })
    watchProgressQueue.current = request.then(() => undefined, () => undefined)
    return request.catch(() => false)
  }, [watchSession])

  const completeVideo = async (): Promise<boolean> => {
    if (!watchSession || watchBusy) return false
    setWatchBusy(true)
    try {
      const response = await fetch('/api/videos/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: watchSession.session_id }) })
      const result = await response.json() as { reward?: { reward_amount?: number; currency?: string }; error?: string }
      if (!response.ok) throw new Error(result.error || 'Keep watching until the video is complete.')
      notify(`Reward credited: ${result.reward?.currency ?? watchSession.currency} ${result.reward?.reward_amount ?? watchSession.reward_amount}`)
      setWatchSession(null)
      if (session?.user) void refreshProfile(session.user.id)
      return true
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not claim the video reward.')
      return false
    } finally {
      setWatchBusy(false)
    }
  }

  const beginCheckout = async (productId?: string) => {
    if (!session) { openAuth('login'); return }
    if (!providerConfigured) { notify('PayLinky checkout is not enabled yet.'); return }
    try {
      const response = await fetch('/api/payments/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(productId ? { productId } : { amount: Number(topUpAmount), currency: profile?.currency ?? 'XAF' }) })
      const result = await response.json() as { checkoutUrl?: string; error?: string }
      if (!response.ok || !result.checkoutUrl) throw new Error(result.error || 'Checkout is unavailable.')
      window.location.assign(result.checkoutUrl)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not start checkout.')
    }
  }

  const sortedProducts = useMemo(() => [...products].sort((a, b) => {
    if (sortOrder === 'price-low') return Number(a.price ?? 0) - Number(b.price ?? 0)
    if (sortOrder === 'price-high') return Number(b.price ?? 0) - Number(a.price ?? 0)
    if (sortOrder === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    return Number(b.is_featured) - Number(a.is_featured)
  }), [products, sortOrder])

  return (
    <div className="app-frame">
      <header className="top-header">
        <div className="top-header-inner">
          <button className="circle-button menu-trigger" aria-label="Open menu" onClick={() => setDrawerOpen(true)}><Menu size={27} /></button>
          <button className="brand-lockup" onClick={() => goTo('home')} aria-label="EARNIZI home"><BrandMark /><span>EARNIZI</span></button>
          <div className="header-actions">
            <button className="circle-button notification-trigger" aria-label="Notifications" onClick={() => { setUnread(0); setDialog('notifications') }}><Bell size={25} />{unread > 0 && <i className="notification-dot">{unread}</i>}</button>
            <button className="profile-trigger" aria-label="Open account" onClick={() => goTo('account')}><UserRound size={29} /><i /></button>
          </div>
        </div>
      </header>

      <main className="main-container">
        {tab === 'home' && (
          <>
            <section className="welcome-hero">
              <div className="hero-halo hero-halo-one" /><div className="hero-halo hero-halo-two" />
              <div className="hero-copy">
                <div className="welcome-pill"><i />Welcome to Earnizi</div>
                <h1>Your digital needs,<br />our priority.</h1>
                <p>Digital products, everyday essentials, and so much more.<br className="wide-only" /> A world of possibilities, all in one place.</p>
              </div>
              <div className="hero-security-art" aria-hidden="true">
                <div className="shield-glow" />
                <svg className="hero-shield-shape" viewBox="0 0 220 260" fill="none">
                  <defs><linearGradient id="shield-fill" x1="25" y1="24" x2="193" y2="233" gradientUnits="userSpaceOnUse"><stop stopColor="#69aaff" stopOpacity=".9" /><stop offset="1" stopColor="#1851db" stopOpacity=".82" /></linearGradient></defs>
                  <path d="M110 9 207 45v77c0 62-38 108-97 130-59-22-97-68-97-130V45L110 9Z" fill="url(#shield-fill)" stroke="rgba(255,255,255,.76)" strokeWidth="5" />
                  <path d="m62 125 35 35 67-77" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="12" />
                </svg>
                <i className="hero-bubble bubble-one" /><i className="hero-bubble bubble-two" />
              </div>
              <div className="hero-search-area">
                <form className="hero-search" onSubmit={(event) => { event.preventDefault(); goTo('store'); setStoreSearch((event.currentTarget.elements.namedItem('hero-search') as HTMLInputElement).value) }}>
                  <Search size={24} /><input name="hero-search" placeholder="Find a service, app, or product..." aria-label="Find a service, app, or product" />
                  <button type="submit" aria-label="Search store"><ArrowRight size={25} /></button>
                </form>
                <div className="popular-searches"><span>Popular:</span>{popularSearches.map((term) => <button key={term} onClick={() => { goTo('store'); setStoreSearch(term) }}>{term}</button>)}</div>
              </div>
            </section>

            <section className="benefits-grid" aria-label="EARNIZI benefits">
              {benefits.map(({ icon: Icon, title, caption, color }) => <article className="benefit-card" key={title}><span className={`benefit-icon benefit-${color}`}><Icon size={27} strokeWidth={2.15} /></span><strong>{title}</strong><p>{caption}</p></article>)}
            </section>

            <section className="services-section">
              <div className="section-heading">
                <div className="section-heading-main"><Flame className="flame-icon" size={38} fill="#ff6f38" strokeWidth={1.6} /><div><h2>Our services</h2><p>Everything you need, right where you need it.</p></div></div>
                <button className="view-all-link" onClick={() => goTo('categories')}>View all services <ArrowRight size={21} /></button>
              </div>
              <div className="service-grid">
                {serviceCategories.map((category) => <button key={category.id} className={`service-card card-${category.color}`} onClick={() => chooseService(category)}><span className="service-art"><ServiceArt kind={category.kind} /></span><strong>{category.title}</strong><p>{category.description}</p><span className="service-card-arrow"><ChevronRight size={21} /></span></button>)}
              </div>
            </section>

            <section className="video-reward-banner">
              <span className="video-banner-art"><Film size={31} /></span>
              <div><span className="video-eyebrow">YOUR DAILY REWARD</span><h2>Watch videos. Earn rewards.</h2><p>Videos are the way to earn on EARNIZI—no games, just watch and collect.</p></div>
              <button onClick={() => { setDialog('videos'); setVideosLoaded(false) }}>Explore videos <ArrowRight size={18} /></button>
            </section>
          </>
        )}

        {tab === 'store' && (
          <section className="store-page">
            <div className="store-intro-row"><div><p className="eyebrow">THE DIGITAL STORE</p><h1>Your next upgrade<br className="store-title-break" /> is here.</h1><p className="store-lede">Explore a growing collection of digital products. Find your next good thing.</p></div><button className="purchase-shortcut" onClick={() => { if (!session) openAuth(); else setDialog('purchases') }}><Package size={19} /> My purchases</button></div>
            <form className="store-search" onSubmit={(event) => event.preventDefault()}><Search size={25} /><input value={storeSearch} onChange={(event) => setStoreSearch(event.target.value)} placeholder="Search your next digital favorite..." aria-label="Search digital products" /><button type="submit" onClick={() => setTab('store')}>Search <ArrowRight size={19} /></button></form>
            <div className="store-tools"><div className="category-chips"><button className={storeCategory === 'all' ? 'category-chip selected' : 'category-chip'} onClick={() => setStoreCategory('all')}><Sparkles size={17} />All products</button>{serviceCategories.map((category) => <button key={category.id} className={storeCategory === category.id ? 'category-chip selected' : 'category-chip'} onClick={() => setStoreCategory(category.id)}>{category.title}</button>)}</div><div className="sort-wrap"><button className="sort-button" onClick={() => setSortOpen((value) => !value)}><SlidersHorizontal size={18} /><span>{sortOrder === 'featured' ? 'Featured first' : sortOrder === 'newest' ? 'Newest first' : sortOrder === 'price-low' ? 'Price: low to high' : 'Price: high to low'}</span><ChevronDown size={17} /></button>{sortOpen && <div className="sort-menu">{[{ id: 'featured', label: 'Featured first' }, { id: 'newest', label: 'Newest first' }, { id: 'price-low', label: 'Price: low to high' }, { id: 'price-high', label: 'Price: high to low' }].map((option) => <button key={option.id} onClick={() => { setSortOrder(option.id); setSortOpen(false) }}>{option.label}{sortOrder === option.id && <Check size={15} />}</button>)}</div>}</div></div>
            <div className="product-count-row"><span>Discover something good.</span><i />{productsLoading ? <span>Loading products…</span> : <span>{sortedProducts.length} {sortedProducts.length === 1 ? 'product' : 'products'}</span>}</div>
            {!productsLoading && sortedProducts.length === 0 ? (
              <div className="empty-products"><span className="empty-package"><PackageOpen size={42} /></span><h2>{productsSchemaReady ? 'Nothing here just yet.' : 'Your store is getting ready.'}</h2><p>{productsSchemaReady ? 'Try another search or category. Your next favorite might be one click away.' : 'Run the EARNIZI Supabase migration to publish products and categories.'}</p><button onClick={() => { setStoreSearch(''); setStoreCategory('all') }}>Explore all products <ArrowRight size={20} /></button></div>
            ) : sortedProducts.length > 0 ? <div className="product-grid">{sortedProducts.map((product) => <article className="product-card" key={product.id}><div className="product-image">{product.image_url ? <img src={product.image_url} alt="" /> : <Package size={42} />}{product.is_featured && <i className="featured-label">FEATURED</i>}</div><div className="product-card-body"><span className="product-category-label">{product.category || 'DIGITAL PRODUCT'}</span><h2>{product.title}</h2><p>{product.description || 'A great digital find, ready for you.'}</p><div className="product-card-footer"><strong>{product.is_free ? 'Free' : `${product.currency || 'XAF'} ${Number(product.price || 0).toLocaleString()}`}</strong><button onClick={() => void beginCheckout(product.id)}>View product <ArrowRight size={15} /></button></div></div></article>)}</div> : null}
          </section>
        )}

        {tab === 'categories' && (
          <section className="categories-page"><p className="eyebrow">BROWSE BY INTEREST</p><h1>Find your next<br />favorite thing.</h1><p className="page-lede">Explore the EARNIZI collection by category.</p><div className="category-list-grid">{serviceCategories.map((category) => <button key={category.id} className={`category-list-card card-${category.color}`} onClick={() => chooseService(category)}><span className="category-list-art"><ServiceArt kind={category.kind} /></span><span><strong>{category.title}</strong><small>{category.details}</small></span><ArrowRight size={20} /></button>)}</div></section>
        )}

        {tab === 'numbers' && (
          <section className="numbers-page"><p className="eyebrow">PRIVATE & READY WHEN YOU ARE</p><h1>Your number,<br />your next step.</h1><p className="page-lede">Choose a virtual number for verification, messaging, and more.</p><div className="numbers-feature"><span className="numbers-icon"><Smartphone size={32} /></span><div><h2>Virtual numbers</h2><p>Pick a country and service to see available numbers and pricing.</p></div><BadgeCheck size={22} /></div><div className="number-options"><div className="number-option"><span className="country-code-badge">CM</span><div><strong>Cameroon</strong><small>MTN · Orange · XAF</small></div><ChevronRight size={19} /></div><div className="number-option"><span className="country-code-badge country-code-world"><Globe size={22} /></span><div><strong>Worldwide</strong><small>190+ countries</small></div><ChevronRight size={19} /></div></div>{numberRequests.length > 0 && <div className="active-numbers"><h2>Your numbers</h2>{numberRequests.map((request) => <article key={request.id} className="active-number-row"><span><Smartphone size={18} /></span><div><strong>{request.phone_number || `${request.country_code} · ${request.service_name}`}</strong><small>{request.service_name} · {request.status}</small></div>{request.expires_at && <small>Until {new Date(request.expires_at).toLocaleDateString()}</small>}</article>)}</div>}<div className="number-info"><ShieldCheck size={22} /><div><strong>Safe, simple verification</strong><p>Available numbers and checkout options will appear here once the EARNIZI number provider is configured.</p></div></div><button className="primary-cta" onClick={() => { setStoreCategory('virtual-numbers'); goTo('store'); setStoreCategory('virtual-numbers') }}>Browse digital services <ArrowRight size={18} /></button></section>
        )}

        {tab === 'account' && (
          <section className="account-page"><p className="eyebrow">YOUR LITTLE CORNER</p><h1>My account</h1><p className="page-lede">Your details, your purchases, your possibilities. All in one place.</p>
            {session?.user ? <div className="profile-card"><span className="account-avatar"><UserRound size={39} /></span><div className="profile-info"><small>Good to see you</small><h2>{profile?.name || session.user.email?.split('@')[0] || 'EARNIZI member'}</h2><p>{profile?.email || session.user.email}</p><span>{profile?.country ? (profile.country === 'CM' ? 'Cameroon' : profile.country) : 'EARNIZI account'} <i /> {profile?.currency || 'XAF'} account</span></div><button className="profile-settings" onClick={() => setDialog('support')} aria-label="Account settings"><SlidersHorizontal size={19} /></button></div> : <div className="profile-card guest-profile"><span className="account-avatar"><UserRound size={39} /></span><div className="profile-info"><small>Welcome to EARNIZI</small><h2>Your account, all in one place.</h2><p>Sign in to manage purchases, numbers, and rewards.</p></div><button className="primary-small" onClick={() => openAuth('login')}>Sign in</button></div>}
            <button className="wallet-card" onClick={() => setDialog('wallet')}><span className="wallet-card-top"><span><Wallet size={21} /> Your wallet</span><span className="wallet-add"><Plus size={25} /></span></span><strong>{profile?.currency || 'XAF'} {Number(profile?.balance || 0).toLocaleString()}</strong><small>Available for your next purchase</small></button>
            <div className="account-section-title"><h2>Everything, right here.</h2><p>A little less searching. A little more doing.</p></div>
            <div className="account-links"><button onClick={() => { if (!session) openAuth(); else setDialog('purchases') }}><span className="account-link-icon icon-blue"><Package size={22} /></span><span><strong>My purchases</strong><small>Orders, receipts, and your deliveries.</small></span><ChevronRight size={20} /></button><button onClick={() => goTo('numbers')}><span className="account-link-icon icon-purple"><Smartphone size={22} /></span><span><strong>My numbers</strong><small>Your active numbers and messages.</small></span><ChevronRight size={20} /></button><button onClick={() => { setVideosLoaded(false); setDialog('videos') }}><span className="account-link-icon icon-green"><Film size={22} /></span><span><strong>Video rewards</strong><small>Watch videos to earn account rewards.</small></span><ChevronRight size={20} /></button><button onClick={() => setDialog('support')}><span className="account-link-icon icon-orange"><CircleHelp size={22} /></span><span><strong>Help & support</strong><small>Friendly support when you need it.</small></span><ChevronRight size={20} /></button></div>
            {profile?.is_admin && <a className="admin-link" href="/admin"><SlidersHorizontal size={18} />Open admin dashboard <ArrowRight size={17} /></a>}
            {session?.user && <button className="signout-button" onClick={() => void signOut()}><LogOut size={17} /> Sign out</button>}
          </section>
        )}
      </main>

      <nav className="bottom-nav" aria-label="Main navigation">{tabs.map(({ id, title, icon: Icon }) => <button key={id} className={`nav-item ${tab === id ? 'active' : ''}`} onClick={() => goTo(id)} aria-current={tab === id ? 'page' : undefined}><Icon size={27} strokeWidth={tab === id ? 2.35 : 1.9} /><span>{title}</span></button>)}</nav>

      {drawerOpen && <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDrawerOpen(false) }}><aside className="drawer-panel"><div className="drawer-header"><button className="brand-lockup" onClick={() => goTo('home')}><BrandMark /><span>EARNIZI</span></button><button className="circle-button" onClick={() => setDrawerOpen(false)} aria-label="Close menu"><X size={20} /></button></div><p className="drawer-caption">DISCOVER EARNIZI</p>{tabs.map(({ id, title, icon: Icon }) => <button key={id} className="drawer-link" onClick={() => goTo(id)}><Icon size={20} />{title}<ChevronRight size={17} /></button>)}<div className="drawer-separator" /><button className="drawer-link" onClick={() => { setDrawerOpen(false); setDialog('videos') }}><Film size={20} />Watch videos & earn<ChevronRight size={17} /></button><button className="drawer-link" onClick={() => { setDrawerOpen(false); setDialog('support') }}><Headphones size={20} />Help & support<ChevronRight size={17} /></button><div className="drawer-bottom"><span><ShieldCheck size={20} /></span><strong>Good things, safely delivered.</strong><p>Digital essentials, everyday confidence.</p></div></aside></div>}

      {dialog === 'notifications' && <Dialog title="Notifications" eyebrow="YOUR EARNIZI UPDATES" onClose={() => setDialog(null)}><div className="notification-stack"><div className="notice-row"><span className="notice-icon notice-blue"><Sparkles size={19} /></span><div><strong>Welcome to EARNIZI</strong><p>Your digital essentials are all in one place.</p><small>Just now</small></div><i /></div><div className="notice-row"><span className="notice-icon notice-purple"><ShieldCheck size={19} /></span><div><strong>Shop with confidence</strong><p>Check product details before placing an order.</p><small>Today</small></div><i /></div><div className="notice-row"><span className="notice-icon notice-orange"><Film size={19} /></span><div><strong>Video rewards</strong><p>Watch videos for rewards when campaigns are available.</p><small>Today</small></div></div></div><button className="modal-primary full-width" onClick={() => setDialog(null)}>Done</button></Dialog>}

      {dialog === 'auth' && <Dialog title={authMode === 'login' ? 'Welcome back' : 'Create your account'} eyebrow="EARNIZI ACCOUNT" onClose={() => setDialog(null)}><form className="auth-form" onSubmit={submitAuth}>{authMode === 'signup' && <label>Full name<input required autoComplete="name" value={authForm.name} onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })} placeholder="Your name" /></label>}<label>Email address<input required type="email" autoComplete="email" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} placeholder="you@example.com" /></label><label>Password<input required type="password" autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} minLength={6} value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} placeholder="At least 6 characters" /></label><button className="modal-primary full-width" disabled={authBusy}>{authBusy ? 'Please wait…' : authMode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight size={17} /></button></form><p className="auth-switch">{authMode === 'login' ? 'New to EARNIZI?' : 'Already have an account?'} <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}>{authMode === 'login' ? 'Create an account' : 'Sign in'}</button></p>{!supabase && <p className="setup-note">Account access needs Supabase settings in <code>.env.local</code>.</p>}</Dialog>}

      {dialog === 'wallet' && <Dialog title="Your wallet" eyebrow="EARNIZI WALLET" onClose={() => setDialog(null)}><div className="wallet-modal-card"><span>AVAILABLE BALANCE</span><strong>{profile?.currency || 'XAF'} {Number(profile?.balance || 0).toLocaleString()}</strong><p>Use your wallet for digital purchases and services.</p></div><label className="amount-field">Add funds<input inputMode="decimal" type="number" min="100" step="100" value={topUpAmount} onChange={(event) => setTopUpAmount(event.target.value)} placeholder="e.g. 5,000" /></label><button className="modal-primary full-width" disabled={!providerConfigured || !session || !topUpAmount} onClick={() => void beginCheckout()}><CreditCard size={17} />{providerConfigured ? 'Continue to secure checkout' : 'PayLinky setup pending'}</button><p className="setup-note">{providerConfigured ? 'You will be redirected to PayLinky secure checkout.' : 'Checkout will be enabled after PayLinky API and signed-webhook details are verified and implemented.'}</p></Dialog>}

      {dialog === 'videos' && <Dialog title="Video rewards" eyebrow="WATCH. EARN. REPEAT." onClose={() => setDialog(null)}>{watchSession ? <div className="video-player-wrap"><div className="video-player-heading"><span><Play size={16} fill="currentColor" /> Now watching: {watchSession.title}</span><strong>{watchSession.currency} {watchSession.reward_amount}</strong></div><RewardVideoPlayer key={watchSession.session_id} videoUrl={watchSession.video_url} title={watchSession.title} sessionId={watchSession.session_id} onProgress={recordVideoProgress} onEnded={completeVideo} /><p>Watch the complete video to claim the configured reward. Playback progress and completion time are checked by the server.</p>{watchBusy && <span className="inline-status">Verifying your watch…</span>}</div> : <>{!videosLoaded ? <div className="loading-state"><span className="spinner" />Loading videos…</div> : videos.length === 0 ? <div className="video-empty"><span><Film size={30} /></span><h3>{videosConfigured ? 'No videos available right now.' : 'Connect Supabase to load video campaigns.'}</h3><p>New video campaigns will appear here. EARNIZI uses videos as its only reward activity.</p></div> : <div className="video-campaign-list">{videos.map((video) => <article key={video.id} className="video-campaign"><div className="video-thumb">{video.thumbnail_url ? <img src={video.thumbnail_url} alt="" /> : <Film size={27} />}<span><Play size={14} fill="currentColor" /></span></div><div className="video-campaign-info"><strong>{video.title}</strong><p>{video.description || `Minimum watch ${video.duration_seconds}s`}</p><small><Clock3 size={13} /> Min. {video.duration_seconds}s <i /> {video.currency} {video.reward_amount}</small></div><button disabled={watchBusy} onClick={() => void startVideo(video)} aria-label={`Watch ${video.title}`}><Play size={17} fill="currentColor" /></button></article>)}</div>}<div className="video-security-note"><LockKeyhole size={15} /> Rewards are credited only after a server-verified full watch.</div></>}</Dialog>}

      {dialog === 'purchases' && <Dialog title="My purchases" eyebrow="YOUR DIGITAL ORDERS" onClose={() => setDialog(null)}>{!purchasesLoaded ? <div className="loading-state"><span className="spinner" />Loading your orders…</div> : purchases.length === 0 ? <div className="purchases-empty"><span><PackageOpen size={34} /></span><h3>Your purchases will appear here.</h3><p>Browse the store to find your next digital favorite.</p><button className="modal-primary" onClick={() => goTo('store')}>Browse the store <ArrowRight size={17} /></button></div> : <div className="purchase-list">{purchases.map((order) => <article key={order.id} className="purchase-row"><span className="purchase-icon"><Package size={20} /></span><div><strong>{order.store_order_items?.[0]?.title_snapshot || `Order ${order.order_number}`}</strong><small>#{order.order_number} · {new Date(order.created_at).toLocaleDateString()}</small></div><span className={`order-status status-${order.status}`}>{order.status.replace('_', ' ')}</span><b>{order.currency} {Number(order.total).toLocaleString()}</b></article>)}</div>}</Dialog>}

      {dialog === 'support' && <Dialog title="Here to help" eyebrow="EARNIZI SUPPORT" onClose={() => setDialog(null)}><p className="support-lede">Need a hand? Find help for your account, wallet, numbers, or purchases.</p><div className="support-options"><button onClick={() => notify('Support articles will be available soon.')}><span><CircleHelp size={20} /></span><div><strong>Help center</strong><small>Quick answers to common questions</small></div><ChevronRight size={18} /></button><button onClick={() => notify('Support chat will be available soon.')}><span><MessageCircle size={20} /></span><div><strong>Contact support</strong><small>Friendly help whenever you need it</small></div><ChevronRight size={18} /></button></div></Dialog>}

      {toast && <div className="toast" role="status"><span><Check size={15} /></span>{toast}</div>}
    </div>
  )
}
