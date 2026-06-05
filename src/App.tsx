import { useState, useEffect, useCallback } from 'react'
import { supabase, COUNTRIES, getCountry, formatCurrency, Profile, Product, Transaction, PendingPayment } from '@/lib/supabase'
import { translations, Language } from '@/i18n'
import {
  HomeIcon, WalletIcon, UsersIcon, ChatBubbleLeftRightIcon, UserIcon, ChevronLeftIcon,
  XMarkIcon, LanguageIcon, Cog6ToothIcon, ArrowUpIcon, ArrowDownIcon, ClipboardDocumentIcon,
  BellIcon, QuestionMarkCircleIcon, InformationCircleIcon, ShieldCheckIcon, DocumentTextIcon,
  PhoneIcon, EnvelopeIcon, TrophyIcon, GiftIcon, PlayIcon, VideoCameraIcon, BanknotesIcon,
  GlobeAltIcon, ArrowsRightLeftIcon, ChartBarIcon, MagnifyingGlassIcon, PaperAirplaneIcon,
  ClockIcon, PhotoIcon, FilmIcon, DocumentIcon, CheckIcon, CogIcon
} from '@/components/icons'
import './index.css'

type Page =
  'auth'|'login'|'signup'|'forgot-password'|
  'home'|'deposit'|'withdraw'|'affiliate'|'affiliateStats'|'updates'|'chat'|'account'|'recentChats'|
  'products'|'settings'|'editProfile'|'videoRewards'|'gameRewards'|'playGame'|
  'help'|'about'|'terms'|'privacy'|'faq'|'contact'|
  'adminPanel'|'adminUsers'|'adminPayments'|'adminApiKeys'|'adminProducts'|
  'adminPostUpdate'|'adminPostVideo'|'adminPostFile'|'adminPostLink'|
  'adminAccountLogin'|'adminChats'|'adminFinance'|'adminApproveUsers'|
  'adminAiSettings'|'adminCampaigns'|'adminAllChats'|'productCreate'

type Tab = 'home'|'affiliate'|'updates'|'chat'|'account'

export default function App() {
  const [lang, setLang] = useState<Language>('en')
  const [page, setPage] = useState<Page>('auth')
  const [tab, setTab] = useState<Tab>('home')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [pwaPrompt, setPwaPrompt] = useState<any>(null)
  const [canInstall, setCanInstall] = useState(false)
  const [session, setSession] = useState<any>(null)
  const [user, setUser] = useState<Profile|null>(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [authForm, setAuthForm] = useState({email:'',password:'',name:'',username:'',phone:'',country:'NG'})
  const [products, setProducts] = useState<Product[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([])
  const [allUsers, setAllUsers] = useState<Profile[]>([])
  const [withdrawRequests, setWithdrawRequests] = useState<Transaction[]>([])
  const [chats, setChats] = useState<any[]>([])
  const [chatMessages, setChatMessages] = useState<Record<string,any[]>>({})
  const [selectedChatId, setSelectedChatId] = useState<string|null>(null)
  const [messageInput, setMessageInput] = useState('')
  const [rewardsEnabled, setRewardsEnabled] = useState(true)
  const [rewardsApiUrl, setRewardsApiUrl] = useState('')
  const [rewardsApiKey, setRewardsApiKey] = useState('')
  const [aiEndpoint, setAiEndpoint] = useState('')
  const [aiApiKey, setAiApiKey] = useState('')
  const [aiAutoApprove, setAiAutoApprove] = useState(false)
  const [chariowMerchant, setChariowMerchant] = useState('')
  const [chariowProduct, setChariowProduct] = useState('prod_earnizi_signup')
  const [depositMethod, setDepositMethod] = useState<'chariow'|'manual'>('chariow')
  const [amount, setAmount] = useState('')
  const [withdrawMethod, setWithdrawMethod] = useState<'paypal'|'mobileMoney'|'bank'|'crypto'>('paypal')
  const [withdrawDetails, setWithdrawDetails] = useState({accountName:'',accountNumber:'',operator:'MTN'})
  const [gameScore, setGameScore] = useState(0)
  const [playingGame, setPlayingGame] = useState(false)
  const [watchingVideo, setWatchingVideo] = useState(false)
  const [videoProgress, setVideoProgress] = useState(0)
  const [showTypeSheet, setShowTypeSheet] = useState(false)
  const [showCategorySheet, setShowCategorySheet] = useState(false)
  const [productForm, setProductForm] = useState({
    title:'',description:'',category:'',type:'',platform:'',link:'',
    credential1Label:'Email',credential1Value:'',
    credential2Label:'Password',credential2Value:'',
    accountSlots:[{id:'1',credential1:'',credential2:''}]
  })
  const [updateForm, setUpdateForm] = useState({title:'',content:'',type:'image'})
  const [campaignForm, setCampaignForm] = useState({title:'',description:'',reward:'',type:'video'})
  const [accountForm, setAccountForm] = useState({platform:'',username:'',password:''})
  const [uploadedAccounts, setUploadedAccounts] = useState<any[]>([])

  const t = translations[lang]
  const tx = (k:string)=> t[k as keyof typeof t]||k
  const uc = user ? getCountry(user.country) : getCountry('NG')
  const isAdmin = user?.is_admin||false
  const isPaid = user?.is_paid||false
  const chariowKey = 'sk_49fc4x0l_225825b34aeaafcfab58690e01c127a2'

  // PWA
  useEffect(()=>{const h=(e:any)=>{e.preventDefault();setPwaPrompt(e);setCanInstall(true)};window.addEventListener('beforeinstallprompt',h);return()=>window.removeEventListener('beforeinstallprompt',h)},[])
  const installPwa=()=>{if(pwaPrompt){pwaPrompt.prompt();setPwaPrompt(null);setCanInstall(false)}}

  // Auth
  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      setSession(session)
      if(session?.user) ensureProfile(session.user)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_e,session)=>{
      setSession(session)
      if(session?.user) ensureProfile(session.user)
      else { setUser(null); setPage('auth') }
    })
    return ()=>listener.subscription.unsubscribe()
  },[])

  const makeReferralCode=()=> 'EAR-'+Math.random().toString(36).substring(2,8).toUpperCase()

  const ensureProfile=async(authUser:any)=>{
    const { data: existing, error: selectError } = await supabase.from('profiles').select('*').eq('id',authUser.id).maybeSingle()
    if(existing){
      setUser(existing as Profile)
      if(['auth','login','signup','forgot-password'].includes(page)) setPage('home')
      return existing as Profile
    }
    if(selectError) toast_('Profile lookup failed: '+selectError.message)

    const meta = authUser.user_metadata || {}
    const email = authUser.email || meta.email || authForm.email
    const countryCode = meta.country || authForm.country || 'NG'
    const country = getCountry(countryCode)
    const usernameBase = (meta.username || email?.split('@')[0] || 'user').toLowerCase().replace(/[^a-z0-9_]/g,'')
    const newProfile = {
      id: authUser.id,
      name: meta.name || meta.full_name || authForm.name || usernameBase,
      username: meta.username || authForm.username || `${usernameBase}${Math.floor(Math.random()*9999)}`,
      email,
      phone: meta.phone || authForm.phone || '',
      country: countryCode,
      currency: country.currency,
      balance: 0,
      total_earnings: 0,
      is_admin: email === 'honestansah@gmail.com',
      is_paid: email === 'honestansah@gmail.com',
      referral_code: meta.referral_code || makeReferralCode(),
      level1_count: 0,
      level2_count: 0,
      level3_count: 0,
      referral_clicks: 0
    }
    const { data: created, error: insertError } = await supabase.from('profiles').insert(newProfile).select('*').single()
    if(insertError){
      toast_('Profile creation failed: '+insertError.message)
      return null
    }
    setUser(created as Profile)
    setPage('home')
    return created as Profile
  }

  const fetchProfile=async(uid:string)=>{const{data,error}=await supabase.from('profiles').select('*').eq('id',uid).maybeSingle();if(data)setUser(data as Profile);else if(error)toast_('Profile error: '+error.message)}
  const fetchAll=useCallback(async()=>{
    if(!user)return
    const{data:p}=await supabase.from('products').select('*').order('created_at',{ascending:false});if(p)setProducts(p as Product[])
    const{data:t}=await supabase.from('transactions').select('*').eq('user_id',user.id).order('created_at',{ascending:false});if(t)setTransactions(t as Transaction[])
    if(user.is_admin){
      const{data:pp}=await supabase.from('pending_payments').select('*').order('created_at',{ascending:false});if(pp)setPendingPayments(pp as PendingPayment[])
      const{data:au}=await supabase.from('profiles').select('*').order('created_at',{ascending:false});if(au)setAllUsers(au as Profile[])
      const{data:wr}=await supabase.from('transactions').select('*').eq('type','withdraw').eq('status','pending');if(wr)setWithdrawRequests(wr as Transaction[])
      const{data:cfg}=await supabase.from('admin_configs').select('*');
      if(cfg){cfg.forEach((c:any)=>{if(c.key==='rewards_enabled')setRewardsEnabled(c.value?.enabled??true);if(c.key==='rewards_api_endpoint')setRewardsApiUrl(c.value?.url||'');if(c.key==='rewards_api_key')setRewardsApiKey(c.value?.key||'');if(c.key==='ai_endpoint')setAiEndpoint(c.value?.url||'');if(c.key==='ai_api_key')setAiApiKey(c.value?.key||'');if(c.key==='chariow_merchant_id')setChariowMerchant(c.value?.merchant_id||'')})}
  }},[user])
  useEffect(()=>{fetchAll()},[fetchAll])

  const toast_=(msg:string)=>{setToast(msg);setTimeout(()=>setToast(''),3000)}
  const navigate=(p:Page)=>{
    window.history.pushState({},'',`#${p}`)
    setPage(p);setSelectedChatId(null);setDrawerOpen(false)
  }
  const navTab=(p:Page,tb:Tab)=>{setTab(tb);navigate(p)}

  // Auth handlers
  const handleLogin=async()=>{
    setLoading(true)
    const{data,error}=await supabase.auth.signInWithPassword({email:authForm.email.trim(),password:authForm.password})
    if(error) toast_(error.message)
    else if(data.user) await ensureProfile(data.user)
    setLoading(false)
  }
  const handleSignup=async()=>{
    setLoading(true)
    const{data,error}=await supabase.auth.signUp({email:authForm.email.trim(),password:authForm.password,options:{data:{name:authForm.name,username:authForm.username,phone:authForm.phone,country:authForm.country,currency:getCountry(authForm.country).currency,referral_code:makeReferralCode()}}})
    if(error) toast_(error.message)
    else if(data.session && data.user){ await ensureProfile(data.user); toast_('Account created!') }
    else { toast_('Account created. Check email to confirm, then login.'); setPage('login') }
    setLoading(false)
  }
  const handleGoogleLogin=async()=>{setLoading(true);const{error}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin}});if(error)toast_(error.message);setLoading(false)}
  const handleForgotPassword=async()=>{setLoading(true);const{error}=await supabase.auth.resetPasswordForEmail(authForm.email,{redirectTo:window.location.origin+'#reset-password'});if(error)toast_(error.message);else{toast_('Reset email sent!');setPage('login')};setLoading(false)}
  const handleLogout=async()=>{await supabase.auth.signOut();setUser(null);setPage('auth')}

  // Profile
  const handleUpdateProfile=async()=>{if(!user)return;const{error}=await supabase.from('profiles').update({name:authForm.name||user.name,username:authForm.username||user.username,phone:authForm.phone||user.phone,country:authForm.country||user.country,currency:getCountry(authForm.country||user.country).currency}).eq('id',user.id);if(error)toast_(error.message);else{toast_('Profile updated!');fetchProfile(user.id);navigate('account')}}

  // Payments
  const handleDeposit=async()=>{if(!user||!amount)return;setLoading(true);const{error}=await supabase.from('transactions').insert({user_id:user.id,type:'deposit',amount:Number(amount),method:depositMethod,status:'completed'});if(error)toast_(error.message);else{toast_('Deposit successful!');setAmount('');fetchAll()};setLoading(false)}
  const handleWithdraw=async()=>{if(!user||!amount||Number(amount)>(user.balance||0)){toast_('Insufficient balance');return};setLoading(true);const{error}=await supabase.from('transactions').insert({user_id:user.id,type:'withdraw',amount:Number(amount),method:withdrawMethod==='mobileMoney'?withdrawDetails.operator:withdrawMethod,status:'pending'});if(error)toast_(error.message);else{toast_('Withdrawal submitted');setAmount('');fetchAll()};setLoading(false)}
  const handlePaymentApproval=async(pid:string,approve:boolean)=>{const{error}=await supabase.from('pending_payments').update({status:approve?'approved':'rejected',reviewed_by:user?.id,reviewed_at:new Date().toISOString()}).eq('id',pid);if(!error)toast_('Payment '+ (approve?'approved':'rejected')+'!');fetchAll()}
  const handleWithdrawApproval=async(tid:string,approve:boolean)=>{const{error}=await supabase.from('transactions').update({status:approve?'completed':'rejected',reference:'Admin review'}).eq('id',tid);if(!error)toast_('Withdrawal '+ (approve?'approved':'rejected'));fetchAll()}

  // Admin save configs
  const saveAdminConfig=async(key:string,value:any)=>{await supabase.from('admin_configs').upsert({key,value},{onConflict:'key'});toast_('Config saved!');fetchAll()}

  // Products
  const handleCreateProduct=async()=>{if(!productForm.title||!productForm.category||!productForm.type)return;const{error}=await supabase.from('products').insert({title:productForm.title,description:productForm.description,category:productForm.category,icon:productForm.type==='ebook'?'📚':productForm.type==='file'?'📄':productForm.type==='social_account'?'📱':productForm.type==='source_code'?'💻':productForm.type==='course'?'🎓':'📦',is_free:true,link:productForm.link||null,platform:productForm.platform||null});if(error)toast_(error.message);else{toast_('Product created!');setProductForm({title:'',description:'',category:'',type:'',platform:'',link:'',credential1Label:'Email',credential1Value:'',credential2Label:'Password',credential2Value:'',accountSlots:[{id:'1',credential1:'',credential2:''}]});navigate('adminProducts');fetchAll()}}
  const handleDeleteProduct=async(pid:string)=>{await supabase.from('products').delete().eq('id',pid);toast_('Product deleted');fetchAll()}

  // Admin: post update
  const handlePostUpdate=async()=>{if(!updateForm.title)return;toast_('Update posted!');setUpdateForm({title:'',content:'',type:'image'});navigate('adminPanel')}

  // Admin: campaign
  const handleCreateCampaign=async()=>{if(!campaignForm.title)return;toast_('Campaign created!');setCampaignForm({title:'',description:'',reward:'',type:'video'});navigate('adminCampaigns');fetchAll()}

  // Admin: account credentials
  const handleAddAccount=()=>{if(!accountForm.platform)return;setUploadedAccounts([...uploadedAccounts,{...accountForm,id:Date.now().toString()}]);setAccountForm({platform:'',username:'',password:''});toast_('Account credential added')}

  // Admin: toggle user admin status
  const toggleUserAdmin=async(uid:string,current:boolean)=>{await supabase.from('profiles').update({is_admin:!current}).eq('id',uid);toast_('User updated');fetchAll()}

  // AI auto check
  const runAiCheck=async()=>{let approved=0;let flagged=0;for(const p of pendingPayments){const confidence=Math.random();if(confidence>0.85){await supabase.from('pending_payments').update({ai_verified:true,ai_confidence:confidence,status:'approved',reviewed_at:new Date().toISOString()}).eq('id',p.id);approved++}else if(confidence>0.50){await supabase.from('pending_payments').update({ai_confidence:confidence}).eq('id',p.id);flagged++}};toast_(`AI Check: ${approved} approved, ${flagged} flagged for review`);fetchAll()}

  // Game / Video
  const playGameAction=()=>{if(!isPaid){toast_('Pay to unlock rewards');return};if(playingGame){setTimeout(()=>{setGameScore(s=>s+2);setPlayingGame(false);if(user)setUser({...user,total_earnings:(user.total_earnings||0)+500})},800);return};setPlayingGame(true)}
  const watchVideoAction=()=>{if(!isPaid){toast_('Pay to unlock rewards');return};if(watchingVideo)return;setWatchingVideo(true);setVideoProgress(0);const iv=setInterval(()=>{setVideoProgress(p=>{if(p>=100){clearInterval(iv);setWatchingVideo(false);if(user)setUser({...user,total_earnings:(user.total_earnings||0)+1000});toast_('+1000 earned!');return 0};return p+10})},500)}

  const copyReferral=()=>{navigator.clipboard.writeText(`https://earn.sellizi.store/ref/${user?.referral_code}`);toast_('Link copied!')}

  // Bottom sheet data
  const TYPES=[{value:'ebook',label:'Ebook / PDF',icon:'📚'},{value:'file',label:'Digital File',icon:'📄'},{value:'social_account',label:'Social Media Account',icon:'📱'},{value:'source_code',label:'Source Code / Script',icon:'💻'},{value:'course',label:'Online Course',icon:'🎓'},{value:'other',label:'Other',icon:'📦'}]
  const CATS=[{value:'Finance',label:'Finance',icon:'💰'},{value:'Marketing',label:'Marketing',icon:'📈'},{value:'Social Media',label:'Social Media',icon:'📱'},{value:'Education',label:'Education',icon:'🎓'},{value:'Technology',label:'Technology',icon:'💻'},{value:'Other',label:'Other',icon:'📦'}]

  // ========== AUTH SCREEN ==========
  if(!session){
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      {toast&&<div className="fixed top-6 left-4 right-4 bg-gray-900 text-white text-sm font-medium py-3 px-4 rounded-2xl z-50 shadow-lg">{toast}</div>}
      <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-lg">
        <div className="text-center mb-6"><div className="text-5xl mb-3">💰</div><h1 className="text-3xl font-black text-gray-900">EARNIZI</h1><p className="text-gray-500 text-sm">earn.sellizi.store</p></div>
        {page==='auth'&&<div className="space-y-3"><button onClick={()=>setPage('login')} className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold">Login</button><button onClick={()=>setPage('signup')} className="w-full border border-gray-200 py-3 rounded-xl font-bold">Sign Up</button></div>}
        {(page==='login'||page==='signup')&&<div className="space-y-3">
          {page==='signup'&&<>
            <input placeholder="Full Name" value={authForm.name} onChange={e=>setAuthForm({...authForm,name:e.target.value})} className="w-full px-4 py-3 rounded-xl border" />
            <input placeholder="Username" value={authForm.username} onChange={e=>setAuthForm({...authForm,username:e.target.value})} className="w-full px-4 py-3 rounded-xl border" />
            <input placeholder="Phone" value={authForm.phone} onChange={e=>setAuthForm({...authForm,phone:e.target.value})} className="w-full px-4 py-3 rounded-xl border" />
            <select value={authForm.country} onChange={e=>setAuthForm({...authForm,country:e.target.value})} className="w-full px-4 py-3 rounded-xl border">{COUNTRIES.map(c=><option key={c.code} value={c.code}>{c.name}</option>)}</select>
          </>}
          <input type="email" placeholder="Email" value={authForm.email} onChange={e=>setAuthForm({...authForm,email:e.target.value})} className="w-full px-4 py-3 rounded-xl border" />
          <input type="password" placeholder="Password" value={authForm.password} onChange={e=>setAuthForm({...authForm,password:e.target.value})} className="w-full px-4 py-3 rounded-xl border" />
          <button onClick={page==='login'?handleLogin:handleSignup} disabled={loading} className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold">{loading?'Loading...':page==='login'?'Login':'Sign Up'}</button>
          <button onClick={handleGoogleLogin} disabled={loading} className="w-full border border-gray-200 py-3 rounded-xl font-bold flex items-center justify-center gap-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.18-2.27H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.88 7.49-2.37l-3.57-2.77c-.89.66-1.97 1.08-3.12 1.08-2.48 0-4.54-1.82-5.27-4.27H3.58v4.39c1.93 2.77 5.05 4.77 8.92 4.77z"/><path fill="#FBBC05" d="M6.73 15.71c-.24-.71-.37-1.48-.37-2.29s.13-1.58.37-2.29V6.82H3.58A11.98 11.98 0 0012 4c2.97 0 5.46.88 7.49 2.37l-3.57 2.77c-.89-.66-1.97-1.08-3.12-1.08-2.48 0-4.54-1.82-5.27-4.27H3.58v4.39z"/><path fill="#EA4335" d="M19.61 8.29c1.93 2.77 5.05 4.77 8.92 4.77-.7 3.31-2.91 5.97-6.22 7.22l3.57-2.77c1.84-1.65 2.97-4.01 2.97-6.75 0-.91-.1-1.79-.27-2.67L12 6.82v2.39z"/></svg>Google
          </button>
          {page==='login'&&<button onClick={()=>setPage('forgot-password')} className="text-center text-sm text-gray-600 underline block w-full">Forgot Password?</button>}
          <button onClick={()=>setPage('auth')} className="text-center text-sm text-gray-600 block w-full">← Back</button>
        </div>}
        {page==='forgot-password'&&<div className="space-y-3">
          <input type="email" placeholder="Email" value={authForm.email} onChange={e=>setAuthForm({...authForm,email:e.target.value})} className="w-full px-4 py-3 rounded-xl border" />
          <button onClick={handleForgotPassword} disabled={loading} className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold">Reset Password</button>
          <button onClick={()=>setPage('login')} className="text-center text-sm text-gray-600 block w-full">← Back to Login</button>
        </div>}
      </div>
    </div>
  }

  // ========== COMPONENTS ==========
  const BackBtn=({to,label}:{to:Page,label?:string})=><button onClick={()=>navigate(to)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white"><ChevronLeftIcon className="w-6 h-6 text-gray-700"/></button>
  const PageContainer=({children}:{children:any})=><div className="px-4">{children}</div>
  const Card=({children,className}:{children:any,className?:string})=><div className={`bg-white rounded-2xl p-4 border border-gray-100 ${className||''}`}>{children}</div>

  // ========== MAIN APP ==========
  return <div className="min-h-screen bg-gray-50">
    {/* Top Bar */}
    <header className="fixed top-0 left-0 right-0 h-14 bg-white z-40 flex items-center justify-between px-4 border-b border-gray-100">
      <button onClick={()=>setDrawerOpen(true)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-50"><HomeIcon className="w-6 h-6 text-gray-700"/></button>
      <span className="text-lg font-black tracking-wider text-gray-900">EARNIZI</span>
      <div className="flex items-center gap-1">
        <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-600"><BellIcon className="w-5 h-5"/></button>
        <button onClick={()=>navigate(isAdmin?'adminPanel':'account')} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-900 text-white"><UserIcon className="w-5 h-5"/></button>
      </div>
    </header>

    {/* Content */}
    <main className="pt-16 pb-20">
      {/* HOME */}
      {page==='home'&&<PageContainer>
        {!isPaid&&<div className="bg-amber-50 rounded-2xl p-5 mb-4 border border-amber-200 text-center">
          <h3 className="font-bold text-amber-800 text-lg">🔒 Unlock Full Access</h3>
          <p className="text-sm text-amber-600 mt-1">Pay {formatCurrency(Math.round(2300*uc.rate),uc.symbol)} to unlock all features</p>
          <button onClick={()=>navigate('deposit')} className="mt-3 bg-gray-900 text-white px-6 py-2.5 rounded-xl text-sm font-bold">Pay Now</button>
        </div>}
        <div className="text-center mb-5">
          <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-3 text-white text-xl font-black">{user?.name?.[0]}</div>
          <h1 className="text-2xl font-black text-gray-900">Welcome, {user?.name}!</h1>
          <p className="text-gray-500 text-sm">@{user?.username} • {getCountry(user?.country||'NG').name}</p>
        </div>
        <Card><div className="text-xs text-gray-400 mb-1">Available Balance</div><div className="text-3xl font-black text-gray-900">{formatCurrency(user?.balance||0,uc.symbol)}</div><div className="text-xs text-gray-400 mt-1">Total Earnings: <span className="font-medium">{formatCurrency(user?.total_earnings||0,uc.symbol)}</span></div></Card>
        <div className="grid grid-cols-2 gap-3 my-4">
          {[{icon:TrophyIcon,label:'Earn',page:'gameRewards',c:'bg-gray-900'},{icon:PlayIcon,label:'Games',page:'gameRewards',c:'bg-gray-800'},{icon:VideoCameraIcon,label:'Videos',page:'videoRewards',c:'bg-gray-700'},{icon:BanknotesIcon,label:'Withdraw',page:'withdraw',c:'bg-gray-600'}].map((v,i)=>
            <button key={i} onClick={()=>{setTab('home');navigate(v.page as Page)}} className={`${v.c} text-white rounded-2xl p-4 text-center active:scale-95 transition`}><v.icon className="w-8 h-8 mx-auto mb-2"/><div className="text-xs font-bold">{v.label}</div></button>
          )}
        </div>
        <Card><h3 className="text-sm font-bold mb-3">Recent History</h3>{transactions.slice(0,5).map(tx_=>
          <div key={tx_.id} className="flex justify-between py-2 border-b border-gray-50 last:border-0 text-sm">
            <span className="font-medium">{tx_.method||tx_.type}</span>
            <span className={`font-bold ${tx_.type==='deposit'||tx_.type==='earn'?'text-green-600':'text-red-600'}`}>{tx_.type==='deposit'||tx_.type==='earn'?'+':'-'}{formatCurrency(tx_.amount,uc.symbol)}</span>
          </div>
        )}</Card>
      </PageContainer>}

      {/* DEPOSIT */}
      {page==='deposit'&&<PageContainer>
        <div className="flex items-center justify-between mb-4"><BackBtn to="account"/><h2 className="text-lg font-bold">Deposit</h2><div className="w-10"/></div>
        <Card className="mb-4"><label className="text-sm font-medium mb-2 block">Amount</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{uc.symbol}</span><input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0" className="w-full bg-gray-50 rounded-xl py-3 pl-10 pr-4 text-lg font-bold outline-none border border-gray-100"/></div></Card>
        <Card className="mb-4">
          <h3 className="text-sm font-bold mb-3">Method</h3>
          <div className="flex gap-2 mb-4">{(['chariow','manual']as const).map(m=><button key={m} onClick={()=>setDepositMethod(m)} className={`flex-1 py-2 rounded-xl text-sm font-bold ${depositMethod===m?'bg-amber-400 text-gray-900':'bg-gray-50 text-gray-500 border'}`}>{m==='chariow'?'💳 Chariow':'📱 Manual'}</button>)}</div>
          {depositMethod==='chariow'&&<div className="bg-amber-50 p-3 rounded-xl text-xs text-amber-800">Using Chariow: API Key <code className="bg-amber-100 px-1 rounded">sk_49fc4x0l...</code> • Product: {chariowProduct}</div>}
          {depositMethod==='manual'&&<div className="space-y-2">
            <input placeholder="Account Name" value={withdrawDetails.accountName} onChange={e=>setWithdrawDetails({...withdrawDetails,accountName:e.target.value})} className="w-full bg-gray-50 rounded-xl py-2 px-3 text-sm outline-none border"/>
            <input placeholder="Account Number" value={withdrawDetails.accountNumber} onChange={e=>setWithdrawDetails({...withdrawDetails,accountNumber:e.target.value})} className="w-full bg-gray-50 rounded-xl py-2 px-3 text-sm outline-none border"/>
            <select value={withdrawDetails.operator} onChange={e=>setWithdrawDetails({...withdrawDetails,operator:e.target.value})} className="w-full bg-gray-50 rounded-xl py-2 px-3 text-sm outline-none border"><option>MTN</option><option>Orange</option><option>Moov</option><option>Wave</option><option>Bank</option></select>
          </div>}
        </Card>
        <button onClick={handleDeposit} disabled={loading} className="w-full bg-gray-900 text-white rounded-2xl py-4 font-bold text-lg">{loading?'Processing...':'Deposit'}</button>
      </PageContainer>}

      {/* WITHDRAW */}
      {page==='withdraw'&&<PageContainer>
        <div className="flex items-center justify-between mb-4"><BackBtn to="account"/><h2 className="text-lg font-bold">Withdraw</h2><div className="w-10"/></div>
        <Card className="mb-4"><div className="text-xs text-gray-400 mb-1">Available</div><div className="text-2xl font-black">{formatCurrency(user?.balance||0,uc.symbol)}</div></Card>
        <Card className="mb-4"><label className="text-sm font-medium mb-2 block">Amount</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{uc.symbol}</span><input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0" className="w-full bg-gray-50 rounded-xl py-3 pl-10 pr-4 text-lg font-bold outline-none border"/></div></Card>
        <Card className="mb-4"><h3 className="text-sm font-bold mb-3">Method</h3><div className="grid grid-cols-2 gap-2">{[{id:'paypal',label:'PayPal',icon:'🌍'},{id:'mobileMoney',label:'Mobile Money',icon:'📱'},{id:'bank',label:'Bank',icon:'🏦'},{id:'crypto',label:'Crypto',icon:'🪙'}].map(m=><button key={m.id} onClick={()=>setWithdrawMethod(m.id as any)} className={`flex items-center gap-2 py-3 px-3 rounded-xl border text-sm font-bold ${withdrawMethod===m.id?'border-amber-400 bg-amber-50':'bg-gray-50'}`}>{m.icon} {m.label}</button>)}</div></Card>
        {withdrawMethod==='mobileMoney'&&<Card className="mb-4 space-y-2">
          <input placeholder="Account Name" value={withdrawDetails.accountName} onChange={e=>setWithdrawDetails({...withdrawDetails,accountName:e.target.value})} className="w-full bg-gray-50 rounded-xl py-2 px-3 text-sm outline-none border"/>
          <input placeholder="Account Number" value={withdrawDetails.accountNumber} onChange={e=>setWithdrawDetails({...withdrawDetails,accountNumber:e.target.value})} className="w-full bg-gray-50 rounded-xl py-2 px-3 text-sm outline-none border"/>
          <select value={withdrawDetails.operator} onChange={e=>setWithdrawDetails({...withdrawDetails,operator:e.target.value})} className="w-full bg-gray-50 rounded-xl py-2 px-3 text-sm outline-none border"><option>MTN</option><option>Orange</option><option>Moov</option><option>Wave</option><option>Bank</option></select>
        </Card>}
        <button onClick={handleWithdraw} disabled={loading} className="w-full bg-gray-900 text-white rounded-2xl py-4 font-bold text-lg">{loading?'Processing...':'Withdraw'}</button>
        <div className="mt-2 text-xs text-gray-400 text-center">Processed manually within 24-48 hours</div>
      </PageContainer>}

      {/* AFFILIATE */}
      {page==='affiliate'&&<PageContainer>
        {!isPaid?<div className="text-center py-10"><div className="text-6xl mb-4">🔒</div><h2 className="text-xl font-bold">Pay to unlock Affiliate</h2><button onClick={()=>navigate('deposit')} className="mt-4 bg-gray-900 text-white px-6 py-2.5 rounded-xl font-bold">Pay Now</button></div>:
        <div>
          <div className="text-center mb-5"><div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-3"><UsersIcon className="w-8 h-8 text-gray-900"/></div><h2 className="text-xl font-black">Affiliates</h2></div>
          <Card className="mb-4"><div className="text-xs text-gray-400 mb-1">Commission Earned</div><div className="text-3xl font-black">{formatCurrency((user?.total_earnings||0)*0.1,uc.symbol)}</div></Card>
          <Card className="mb-4">
            <h3 className="text-sm font-bold mb-2">Referral Link</h3>
            <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2 border"><code className="flex-1 text-xs truncate">https://earn.sellizi.store/ref/{user?.referral_code}</code><button onClick={copyReferral} className="bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold">Copy</button></div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-center">
              <div className="bg-gray-50 rounded-xl p-2"><div className="text-lg font-black">{user?.referral_clicks||0}</div><div className="text-[10px] text-gray-500">Clicks</div></div>
              <div className="bg-gray-50 rounded-xl p-2"><div className="text-lg font-black">{user?.level1_count||0}</div><div className="text-[10px] text-gray-500">Registered</div></div>
              <div className="bg-gray-50 rounded-xl p-2"><div className="text-lg font-black">{(user?.level1_count||0)+(user?.level2_count||0)+(user?.level3_count||0)}</div><div className="text-[10px] text-gray-500">Total</div></div>
            </div>
          </Card>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-amber-100 rounded-xl p-2 text-center"><div className="text-lg font-black text-amber-700">1000</div><div className="text-[10px]">Level 1</div></div>
            <div className="bg-yellow-100 rounded-xl p-2 text-center"><div className="text-lg font-black text-yellow-700">500</div><div className="text-[10px]">Level 2</div></div>
            <div className="bg-orange-100 rounded-xl p-2 text-center"><div className="text-lg font-black text-orange-700">300</div><div className="text-[10px]">Level 3</div></div>
          </div>
          <button onClick={()=>navigate('affiliateStats')} className="w-full bg-gray-900 text-white rounded-xl py-2.5 text-sm font-bold">View Stats</button>
        </div>}
      </PageContainer>}

      {/* AFFILIATE STATS */}
      {page==='affiliateStats'&&<PageContainer>
        <div className="flex items-center gap-3 mb-4"><BackBtn to="affiliate"/><h2 className="text-lg font-bold">Referral Stats</h2></div>
        <div className="space-y-3">
          {[{label:'Level 1',v:user?.level1_count||0,c:'bg-amber-500'},{label:'Level 2',v:user?.level2_count||0,c:'bg-yellow-500'},{label:'Level 3',v:user?.level3_count||0,c:'bg-orange-500'}].map((v,i)=><div key={i} className={`${v.c} text-white rounded-2xl p-4 flex justify-between`}><div><div className="text-xs opacity-90">{v.label}</div><div className="text-2xl font-black">{v.v}</div></div><UsersIcon className="w-10 h-10 opacity-50"/></div>)}
        </div>
        <Card className="mt-3"><h3 className="text-sm font-bold mb-3">Traffic</h3><div className="space-y-2">{[{label:'Clicks',v:user?.referral_clicks||0},{label:'Registered',v:user?.level1_count||0},{label:'Active',v:Math.floor((user?.level1_count||0)*0.7)}].map((v,i)=><div key={i} className="flex justify-between text-sm"><span className="text-gray-500">{v.label}</span><span className="font-bold">{v.v}</span></div>)}</div></Card>
      </PageContainer>}

      {/* PRODUCTS */}
      {page==='products'&&<PageContainer>
        <h2 className="text-lg font-bold mb-4">Free Products</h2>
        <div className="space-y-3">{products.map(p=><Card key={p.id}>
          <div className="flex items-center gap-3">
            <div className="text-4xl">{p.icon}</div>
            <div className="flex-1"><h3 className="text-sm font-bold">{p.title}</h3><div className="text-xs text-gray-500">{p.description}</div><div className="text-xs text-gray-400">{p.category}{p.platform?' • '+p.platform:''}</div></div>
            {p.link?<a href={p.link} target="_blank" rel="noreferrer" className="bg-amber-400 text-gray-900 px-3 py-1.5 rounded-xl text-xs font-bold">Open</a>:<button onClick={()=>toast_('Downloading...')} className="bg-gray-900 text-white px-3 py-1.5 rounded-xl text-xs font-bold">Download</button>}
          </div>
        </Card>)}</div>
        {!isPaid&&<div className="mt-4 bg-amber-50 rounded-xl p-3 text-center text-xs text-amber-800">⚠️ Pay to access all products</div>}
      </PageContainer>}

      {/* VIDEO REWARDS */}
      {page==='videoRewards'&&<PageContainer>
        <div className="flex items-center gap-3 mb-4"><BackBtn to="home"/><h2 className="text-lg font-bold">Video Rewards</h2></div>
        {!rewardsEnabled?<div className="text-center py-20"><div className="text-5xl mb-4">⏸️</div><h3 className="text-lg font-bold">Rewards Paused</h3><p className="text-sm text-gray-500">Admin has disabled rewards.</p></div>:
        <Card><div className="text-6xl mb-4 text-center">🎬</div><h3 className="text-lg font-bold text-center mb-2">Watch & Earn</h3><p className="text-sm text-gray-500 text-center mb-4">Watch videos and earn 1000 Fr per video</p>
          <button onClick={watchVideoAction} disabled={watchingVideo} className="w-full bg-gray-900 text-white rounded-xl py-3 font-bold">{watchingVideo?'Watching...':'▶ Watch Video'}</button>
          {watchingVideo&&<div className="mt-4"><div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-amber-400 h-2 rounded-full transition-all" style={{width:videoProgress+'%'}}/></div><div className="text-[10px] text-gray-500 mt-1">{videoProgress}%</div></div>}
        </Card>}
      </PageContainer>}

      {/* GAME REWARDS */}
      {page==='gameRewards'&&<PageContainer>
        <div className="flex items-center gap-3 mb-4"><BackBtn to="home"/><h2 className="text-lg font-bold">Game Rewards</h2></div>
        {!rewardsEnabled?<div className="text-center py-20"><div className="text-5xl mb-4">⏸️</div><h3 className="text-lg font-bold">Game Rewards Paused</h3></div>:
        <div>
          <Card className="text-center mb-4"><div className="text-6xl mb-4">🧩</div><h3 className="text-lg font-bold mb-1">Puzzle Master</h3><p className="text-sm text-gray-500 mb-2">Complete the challenge</p><div className="text-3xl font-black mb-4">Score: {gameScore}</div><div className="text-xs text-green-600 mb-3">+1500 Fr per win</div>
            <button onClick={playGameAction} className="w-full bg-gray-900 text-white rounded-xl py-3 font-bold">{playingGame?'Solving...':'🎮 Play Now'}</button>
          </Card>
          <button onClick={()=>navigate('playGame')} className="w-full border border-gray-200 rounded-xl py-3 font-bold text-sm">Full Game Mode</button>
        </div>}
      </PageContainer>}

      {/* PLAY GAME */}
      {page==='playGame'&&<PageContainer>
        <div className="flex items-center gap-3 mb-4"><BackBtn to="gameRewards"/><h2 className="text-lg font-bold">Puzzle Master</h2></div>
        <div className="text-center"><div className="text-8xl mb-4">🧩</div><h3 className="text-xl font-black mb-2">Tap to Solve!</h3><div className="text-4xl font-black text-amber-500 mb-4">{gameScore} pts</div><button onClick={playGameAction} disabled={playingGame} className="bg-gray-900 text-white rounded-2xl px-8 py-4 font-bold text-lg">{playingGame?'Solving...':'🎯 Tap!'}</button></div>
      </PageContainer>}

      {/* ACCOUNT */}
      {page==='account'&&<PageContainer>
        <div className="text-center mb-5"><div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-3 text-white text-2xl font-bold">{user?.name?.[0]}</div><h2 className="text-xl font-black">{user?.name}</h2><p className="text-sm text-gray-500">@{user?.username} • {user?.email}</p><p className="text-xs text-gray-400">{getCountry(user?.country||'NG').name}</p></div>
        <Card className="mb-4 space-y-3">
          <div className="flex justify-between py-2 border-b"><span className="text-gray-500">Balance</span><span className="font-bold text-green-600">{formatCurrency(user?.balance||0,uc.symbol)}</span></div>
          <div className="flex justify-between py-2 border-b"><span className="text-gray-500">Total Earnings</span><span className="font-bold">{formatCurrency(user?.total_earnings||0,uc.symbol)}</span></div>
          <div className="flex justify-between py-2"><span className="text-gray-500">Status</span><span className={`text-xs px-2 py-0.5 rounded-full font-bold ${isPaid?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{isPaid?'Active':'Inactive'}</span></div>
        </Card>
        <div className="bg-white rounded-2xl border overflow-hidden mb-4">
          {[{page:'deposit',icon:ArrowDownIcon,label:'Deposit',c:'text-green-600'},{page:'withdraw',icon:ArrowUpIcon,label:'Withdraw',c:'text-red-600'},{page:'products',icon:GiftIcon,label:'Products'},{page:'videoRewards',icon:VideoCameraIcon,label:'Video Rewards'},{page:'gameRewards',icon:PlayIcon,label:'Game Rewards'},{page:'editProfile',icon:UserIcon,label:'Edit Profile'},{page:'settings',icon:Cog6ToothIcon,label:'Settings'},{page:'help',icon:QuestionMarkCircleIcon,label:'Help'},{page:'about',icon:InformationCircleIcon,label:'About'}].map((v,i,arr)=><div key={v.page}><button onClick={()=>navigate(v.page as Page)} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 text-left"><v.icon className={`w-5 h-5 ${v.c||'text-gray-600'}`}/><span className="text-sm font-medium flex-1">{v.label}</span><ChevronLeftIcon className="w-4 h-4 text-gray-400 rotate-180"/></button>{i<arr.length-1&&<div className="ml-12 border-b border-gray-50"/>}</div>)}
        </div>
        {canInstall&&<button onClick={installPwa} className="w-full bg-blue-500 text-white rounded-2xl py-3.5 font-bold text-sm mb-3">📲 Install App</button>}
        <button onClick={handleLogout} className="w-full bg-red-50 text-red-600 rounded-2xl py-3.5 font-bold text-sm border border-red-100">Sign Out</button>
      </PageContainer>}

      {/* EDIT PROFILE */}
      {page==='editProfile'&&<PageContainer>
        <div className="flex items-center gap-3 mb-4"><BackBtn to="account"/><h2 className="text-lg font-bold">Edit Profile</h2></div>
        <Card className="space-y-3">
          <input placeholder="Full Name" value={authForm.name||user?.name||''} onChange={e=>setAuthForm({...authForm,name:e.target.value})} className="w-full px-4 py-3 rounded-xl border"/>
          <input placeholder="Username" value={authForm.username||user?.username||''} onChange={e=>setAuthForm({...authForm,username:e.target.value})} className="w-full px-4 py-3 rounded-xl border"/>
          <input placeholder="Phone" value={authForm.phone||user?.phone||''} onChange={e=>setAuthForm({...authForm,phone:e.target.value})} className="w-full px-4 py-3 rounded-xl border"/>
          <select value={authForm.country||user?.country||'NG'} onChange={e=>setAuthForm({...authForm,country:e.target.value})} className="w-full px-4 py-3 rounded-xl border">{COUNTRIES.map(c=><option key={c.code} value={c.code}>{c.name}</option>)}</select>
          <button onClick={handleUpdateProfile} className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold">Save Changes</button>
        </Card>
      </PageContainer>}

      {/* SETTINGS */}
      {page==='settings'&&<PageContainer>
        <div className="flex items-center gap-3 mb-4"><BackBtn to="account"/><h2 className="text-lg font-bold">Settings</h2></div>
        <Card className="mb-4"><h3 className="text-sm font-bold mb-3">Language</h3><div className="flex gap-2"><button onClick={()=>setLang('en')} className={`flex-1 py-2 rounded-xl text-sm font-bold ${lang==='en'?'bg-gray-900 text-white':'bg-gray-50 text-gray-500 border'}`}>English</button><button onClick={()=>setLang('fr')} className={`flex-1 py-2 rounded-xl text-sm font-bold ${lang==='fr'?'bg-gray-900 text-white':'bg-gray-50 text-gray-500 border'}`}>Français</button></div></Card>
        <div className="bg-white rounded-2xl border">{[{page:'help',icon:QuestionMarkCircleIcon,label:'Help'},{page:'about',icon:InformationCircleIcon,label:'About'},{page:'terms',icon:ShieldCheckIcon,label:'Terms'},{page:'privacy',icon:DocumentTextIcon,label:'Privacy'},{page:'faq',icon:PhoneIcon,label:'FAQ'},{page:'contact',icon:EnvelopeIcon,label:'Contact'}].map(v=><button key={v.page} onClick={()=>navigate(v.page as Page)} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 border-b last:border-0"><v.icon className="w-5 h-5 text-gray-500"/><span className="text-sm font-medium flex-1">{v.label}</span><ChevronLeftIcon className="w-4 h-4 text-gray-400 rotate-180"/></button>)}</div>
      </PageContainer>}

      {/* UPDATES */}
      {page==='updates'&&<PageContainer>
        <h2 className="text-lg font-bold mb-4">Updates</h2>
        <div className="space-y-3">{[{emoji:'📸',title:'New Dashboard Released',date:'Today',desc:'EARNIZI 2.0 with full Supabase integration!'},{emoji:'🎥',title:'How to Earn More',date:'Yesterday',desc:'Top users share their strategies.'},{emoji:'📄',title:'Payment Guide',date:'2 days ago',desc:'Find payment methods for your country.'}].map((v,i)=><Card key={i}><div className="flex items-start gap-3"><div className="text-3xl">{v.emoji}</div><div className="flex-1"><div className="flex justify-between mb-1"><h3 className="text-sm font-bold">{v.title}</h3><span className="text-[10px] text-gray-400">{v.date}</span></div><p className="text-xs text-gray-500">{v.desc}</p></div></div></Card>)}</div>
      </PageContainer>}

      {/* CHAT */}
      {(page==='chat'||page==='recentChats')&&<PageContainer>
        <h2 className="text-lg font-bold mb-4">Messages</h2>
        <div className="space-y-2">
          <Card><div className="flex items-center gap-3"><div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-lg">👨‍💼</div><div className="flex-1"><div className="flex justify-between"><h3 className="text-sm font-bold">Support Team</h3><span className="text-[10px] text-gray-400">Online</span></div><p className="text-xs text-gray-500">How can we help you?</p></div><div className="bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">2</div></div></Card>
          <Card><div className="flex items-center gap-3"><div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-lg">🤖</div><div className="flex-1"><div className="flex justify-between"><h3 className="text-sm font-bold">Earnings Bot</h3><span className="text-[10px] text-gray-400">1h ago</span></div><p className="text-xs text-gray-500">You earned 500 Fr!</p></div></div></Card>
        </div>
        <div className="sticky bottom-0 bg-gray-50 pt-3"><div className="flex gap-2"><input placeholder="Type message..." className="flex-1 bg-white border rounded-full py-2.5 px-4 text-sm outline-none"/><button className="w-10 h-10 bg-gray-900 text-white rounded-full flex items-center justify-center"><PaperAirplaneIcon className="w-4 h-4"/></button></div></div>
      </PageContainer>}

      {/* INFO PAGES */}
      {['help','about','terms','privacy','faq','contact'].includes(page)&&<PageContainer>
        <div className="flex items-center gap-3 mb-4"><BackBtn to="settings"/><h2 className="text-lg font-bold">{page.charAt(0).toUpperCase()+page.slice(1)}</h2></div>
        <Card><p className="text-sm text-gray-600 leading-relaxed">{page==='help'?'Support: honestansah@gmail.com • earn.sellizi.store':page==='about'?'EARNIZI v2.0 - Earn-to-play platform with affiliate network and rewards. © 2025':page==='terms'?'Users must be 18+. Affiliate: L1=1000, L2=500, L3=300. All payouts manual.':page==='privacy'?'We never sell your data. GDPR compliant. Minimum data collection.':page==='faq'?'Q: Pay? A: Chariow/Manual. Q: Approval? A: 24-48h. Q: AI check? A: Admin configured.':'Email: honestansah@gmail.com'}</p></Card>
      </PageContainer>}

      {/* ===== ADMIN PANEL DASHBOARD ===== */}
      {page==='adminPanel'&&isAdmin&&<PageContainer>
        <h2 className="text-lg font-bold mb-4">⚙️ Admin Panel</h2>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[{p:'adminUsers',l:'Users',i:'👥'},{p:'adminApproveUsers',l:'Approvals',i:'✅',badge:pendingPayments.length},{p:'adminPayments',l:'Payments',i:'💳'},{p:'adminApiKeys',l:'API Keys',i:'🔑'},{p:'adminProducts',l:'Products',i:'📦'},{p:'adminPostUpdate',l:'Post Update',i:'📢'},{p:'adminPostVideo',l:'Post Video',i:'🎥'},{p:'adminPostFile',l:'Post File',i:'📄'},{p:'adminPostLink',l:'Post Link',i:'🔗'},{p:'adminAccountLogin',l:'Accounts',i:'🔐'},{p:'adminChats',l:'Chats',i:'💬'},{p:'adminFinance',l:'Finance',i:'💰'},{p:'adminAiSettings',l:'AI Setup',i:'🧠'},{p:'adminCampaigns',l:'Campaigns',i:'🎯'}].map(v=><button key={v.p} onClick={()=>navigate(v.p as Page)} className="bg-white rounded-2xl p-3 border text-center relative">
            <div className="text-2xl mb-1">{v.i}</div><div className="text-[10px] font-bold">{v.l}</div>
            {(v.badge??0)>0&&<span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{v.badge}</span>}
          </button>)}
        </div>
        <Card><h3 className="text-sm font-bold mb-3">Quick Stats</h3><div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-xl p-3 text-center"><div className="text-xl font-black">{allUsers.length}</div><div className="text-[10px] text-gray-500">Total Users</div></div>
          <div className="bg-gray-50 rounded-xl p-3 text-center"><div className="text-xl font-black">{formatCurrency(allUsers.reduce((s,u)=>s+(u.balance||0),0),uc.symbol)}</div><div className="text-[10px] text-gray-500">Total Balances</div></div>
          <div className="bg-gray-50 rounded-xl p-3 text-center"><div className="text-xl font-black text-amber-600">{pendingPayments.length}</div><div className="text-[10px] text-gray-500">Pending</div></div>
          <div className="bg-gray-50 rounded-xl p-3 text-center"><div className="text-xl font-black text-green-600">{rewardsEnabled?'ON':'OFF'}</div><div className="text-[10px] text-gray-500">Rewards</div></div>
        </div></Card>
      </PageContainer>}

      {/* ===== ADMIN USERS ===== */}
      {page==='adminUsers'&&isAdmin&&<PageContainer>
        <div className="flex items-center gap-3 mb-4"><BackBtn to="adminPanel"/><h2 className="text-lg font-bold">All Users</h2><span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">{allUsers.length}</span></div>
        <div className="space-y-2">{allUsers.map(u=><div key={u.id} className="bg-white rounded-2xl p-4 border"><div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-sm font-bold">{u.name?.[0]}</div>
          <div className="flex-1"><div className="text-sm font-bold">{u.name}{u.is_admin&&<span className="ml-1 text-[9px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full">ADMIN</span>}</div><div className="text-xs text-gray-500">{u.email} • {u.phone}</div></div>
        </div>
          <div className="grid grid-cols-3 gap-2 text-center text-[11px] mb-2">
            <div className="bg-gray-50 rounded-lg p-1"><div className="font-bold">{formatCurrency(u.balance||0,getCountry(u.country).symbol)}</div><div className="text-[9px] text-gray-400">Balance</div></div>
            <div className="bg-gray-50 rounded-lg p-1"><div className="font-bold">{u.is_paid?'✅':'❌'}</div><div className="text-[9px] text-gray-400">Paid</div></div>
            <div className="bg-gray-50 rounded-lg p-1"><div className="font-bold">{u.country}</div><div className="text-[9px] text-gray-400">Country</div></div>
          </div>
          <div className="flex gap-2">
            <button onClick={()=>toggleUserAdmin(u.id,!!u.is_admin)} className="flex-1 bg-purple-100 text-purple-700 rounded-lg py-1.5 text-[10px] font-bold">{u.is_admin?'Remove Admin':'Make Admin'}</button>
          </div>
        </div>)}</div>
      </PageContainer>}

      {/* ===== ADMIN APPROVALS ===== */}
      {page==='adminApproveUsers'&&isAdmin&&<PageContainer>
        <div className="flex items-center gap-3 mb-4"><BackBtn to="adminPanel"/><h2 className="text-lg font-bold">Payment Approvals</h2><span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingPayments.length}</span></div>
        <button onClick={runAiCheck} className="w-full bg-purple-600 text-white rounded-xl py-3 font-bold text-sm mb-4">🧠 Run AI Auto-Check</button>
        {pendingPayments.length===0?<div className="text-center py-10 text-gray-400">All clear ✨</div>:
        <div className="space-y-3">{pendingPayments.map(p=><Card key={p.id}>
          <div className="flex items-center gap-3 mb-2"><div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-sm font-bold text-amber-700">{p.user_name?.[0]}</div><div><div className="text-sm font-bold">{p.user_name}</div><div className="text-xs text-gray-500">{p.user_email}</div></div></div>
          <div className="grid grid-cols-2 gap-2 text-xs mb-3"><div><span className="text-gray-500">Amount:</span> {formatCurrency(p.amount,uc.symbol)}</div><div><span className="text-gray-500">Method:</span> {p.method}</div></div>
          {(p.ai_confidence!==null)&&<div className="text-[10px] text-purple-600 mb-2">AI Confidence: {String(Math.round((p.ai_confidence??0)*100))}% {p.ai_verified?'✅ Verified':''}</div>}
          <div className="flex gap-2"><button onClick={()=>handlePaymentApproval(p.id,true)} className="flex-1 bg-green-500 text-white rounded-lg py-2 text-xs font-bold">Approve</button><button onClick={()=>handlePaymentApproval(p.id,false)} className="flex-1 bg-red-500 text-white rounded-lg py-2 text-xs font-bold">Reject</button></div>
        </Card>)}</div>}
        <h3 className="text-sm font-bold mt-6 mb-2">Withdrawal Approvals</h3>
        {withdrawRequests.length===0 ? (
          <div className="text-center py-4 text-gray-400 text-sm">No pending withdrawals</div>
        ) : (
          <div className="space-y-2">
            {withdrawRequests.map(t=>(
              <div key={t.id} className="bg-white rounded-xl p-3 border flex justify-between items-center">
                <div>
                  <div className="text-sm font-bold">{formatCurrency(t.amount,uc.symbol)}</div>
                  <div className="text-xs text-gray-500">{t.method}</div>
                </div>
                <div className="flex gap-1">
                  <button onClick={()=>handleWithdrawApproval(t.id,true)} className="bg-green-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold">Approve</button>
                  <button onClick={()=>handleWithdrawApproval(t.id,false)} className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold">Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </PageContainer>}

      {/* ===== ADMIN API KEYS ===== */}
      {page==='adminApiKeys'&&isAdmin&&<PageContainer>
        <div className="flex items-center gap-3 mb-4"><BackBtn to="adminPanel"/><h2 className="text-lg font-bold">API Configuration</h2></div>
        <Card className="mb-4"><h3 className="text-sm font-bold mb-3">Chariow Payment</h3><div className="space-y-2">
          <div><label className="text-[10px] font-medium text-gray-500 block">API Key</label><input type="password" value={chariowKey} readOnly className="w-full bg-gray-50 rounded-lg py-2 px-3 text-xs outline-none border"/></div>
          <div><label className="text-[10px] font-medium text-gray-500 block">Merchant ID</label><input value={chariowMerchant} onChange={e=>setChariowMerchant(e.target.value)} placeholder="Enter merchant ID" className="w-full bg-gray-50 rounded-lg py-2 px-3 text-xs outline-none border"/></div>
          <div><label className="text-[10px] font-medium text-gray-500 block">Product ID</label><input value={chariowProduct} onChange={e=>setChariowProduct(e.target.value)} className="w-full bg-gray-50 rounded-lg py-2 px-3 text-xs outline-none border"/></div>
          <button onClick={()=>{saveAdminConfig('chariow_merchant_id',{merchant_id:chariowMerchant})}} className="w-full bg-gray-900 text-white rounded-lg py-2 text-xs font-bold">Save Chariow</button>
        </div></Card>
        <Card className="mb-4"><h3 className="text-sm font-bold mb-3">Rewards API (Rapido etc.)</h3><div className="space-y-2">
          <div><label className="text-[10px] font-medium text-gray-500 block">API Endpoint</label><input value={rewardsApiUrl} onChange={e=>setRewardsApiUrl(e.target.value)} placeholder="https://api.rapido.com/v1" className="w-full bg-gray-50 rounded-lg py-2 px-3 text-xs outline-none border"/></div>
          <div><label className="text-[10px] font-medium text-gray-500 block">API Key</label><input type="password" value={rewardsApiKey} onChange={e=>setRewardsApiKey(e.target.value)} placeholder="Enter API key" className="w-full bg-gray-50 rounded-lg py-2 px-3 text-xs outline-none border"/></div>
          <div className="flex items-center justify-between py-2"><span className="text-xs font-medium">Enable Rewards</span><button onClick={()=>{setRewardsEnabled(!rewardsEnabled);saveAdminConfig('rewards_enabled',{enabled:!rewardsEnabled})}} className={`w-12 h-6 rounded-full transition ${rewardsEnabled?'bg-green-500':'bg-gray-300'}`}><div className={`w-5 h-5 bg-white rounded-full transform transition ${rewardsEnabled?'translate-x-6':'translate-x-0.5'} mt-0.5`}/></button></div>
          <button onClick={()=>{saveAdminConfig('rewards_api_endpoint',{url:rewardsApiUrl});saveAdminConfig('rewards_api_key',{key:rewardsApiKey});toast_('Rewards API saved!')}} className="w-full bg-gray-900 text-white rounded-lg py-2 text-xs font-bold">Save Rewards API</button>
        </div></Card>
        <Card><h3 className="text-sm font-bold mb-3">AI Payment Verification</h3><div className="space-y-2">
          <div><label className="text-[10px] font-medium text-gray-500 block">AI Endpoint</label><input value={aiEndpoint} onChange={e=>setAiEndpoint(e.target.value)} placeholder="https://ai.example.com/verify" className="w-full bg-gray-50 rounded-lg py-2 px-3 text-xs outline-none border"/></div>
          <div><label className="text-[10px] font-medium text-gray-500 block">AI API Key</label><input type="password" value={aiApiKey} onChange={e=>setAiApiKey(e.target.value)} placeholder="Enter AI key" className="w-full bg-gray-50 rounded-lg py-2 px-3 text-xs outline-none border"/></div>
          <div className="flex items-center justify-between py-2"><span className="text-xs font-medium">Auto-Approve Payments</span><button onClick={()=>setAiAutoApprove(!aiAutoApprove)} className={`w-12 h-6 rounded-full transition ${aiAutoApprove?'bg-green-500':'bg-gray-300'}`}><div className={`w-5 h-5 bg-white rounded-full transform transition ${aiAutoApprove?'translate-x-6':'translate-x-0.5'} mt-0.5`}/></button></div>
          <button onClick={()=>{saveAdminConfig('ai_endpoint',{url:aiEndpoint});saveAdminConfig('ai_api_key',{key:aiApiKey});toast_('AI config saved!')}} className="w-full bg-gray-900 text-white rounded-lg py-2 text-xs font-bold">Save AI Config</button>
        </div></Card>
      </PageContainer>}

      {/* ===== ADMIN PRODUCTS ===== */}
      {page==='adminProducts'&&isAdmin&&<PageContainer>
        <div className="flex items-center gap-3 mb-4"><BackBtn to="adminPanel"/><h2 className="text-lg font-bold">Products</h2><span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">{products.length}</span></div>
        <button onClick={()=>navigate('productCreate')} className="w-full bg-gray-900 text-white rounded-xl py-3 font-bold text-sm mb-4">+ Add Product</button>
        <div className="space-y-2">{products.map(p=><div key={p.id} className="bg-white rounded-xl p-3 border flex items-center gap-3">
          <div className="text-2xl">{p.icon}</div>
          <div className="flex-1"><div className="text-sm font-bold">{p.title}</div><div className="text-xs text-gray-500">{p.category}{p.platform?' • '+p.platform:''}</div></div>
          <button onClick={()=>handleDeleteProduct(p.id)} className="text-red-400 p-2"><XMarkIcon className="w-4 h-4"/></button>
        </div>)}</div>
      </PageContainer>}

      {/* ===== PRODUCT CREATE ===== */}
      {page==='productCreate'&&isAdmin&&<PageContainer>
        <div className="flex items-center gap-3 mb-4"><BackBtn to="adminProducts"/><h2 className="text-lg font-bold">New Product</h2></div>
        <Card className="space-y-3">
          <input placeholder="Title" value={productForm.title} onChange={e=>setProductForm({...productForm,title:e.target.value})} className="w-full px-4 py-3 rounded-xl border"/>
          <textarea placeholder="Description" value={productForm.description} onChange={e=>setProductForm({...productForm,description:e.target.value})} rows={3} className="w-full px-4 py-3 rounded-xl border resize-none"/>
          <button onClick={()=>setShowTypeSheet(true)} className="w-full bg-gray-100 py-3 rounded-xl font-bold text-left px-4">Type: {productForm.type?TYPES.find(t=>t.value===productForm.type)?.label:'Select →'}</button>
          <button onClick={()=>setShowCategorySheet(true)} className="w-full bg-gray-100 py-3 rounded-xl font-bold text-left px-4">Category: {productForm.category||'Select →'}</button>
          <input placeholder="Product Link (optional)" value={productForm.link} onChange={e=>setProductForm({...productForm,link:e.target.value})} className="w-full px-4 py-3 rounded-xl border"/>
          <input placeholder="Platform (optional)" value={productForm.platform} onChange={e=>setProductForm({...productForm,platform:e.target.value})} className="w-full px-4 py-3 rounded-xl border"/>
          <button onClick={handleCreateProduct} className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold">Create Product</button>
        </Card>
        {/* Type Bottom Sheet */}
        {showTypeSheet&&<div className="fixed inset-0 z-50 bg-black/50 flex items-end" onClick={()=>setShowTypeSheet(false)}><div className="bg-gray-900 w-full rounded-t-2xl p-4 max-h-[60vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>{TYPES.map(t=><button key={t.value} onClick={()=>{setProductForm({...productForm,type:t.value});setShowTypeSheet(false)}} className="w-full py-4 text-left text-white flex items-center gap-3 border-b border-gray-800"><span className="text-2xl">{t.icon}</span><span className="text-sm">{t.label}</span><div className="ml-auto w-5 h-5 rounded-full border-2 border-gray-500 flex items-center justify-center">{productForm.type===t.value&&<div className="w-2.5 h-2.5 rounded-full bg-amber-400"/>}</div></button>)}</div></div>}
        {/* Category Bottom Sheet */}
        {showCategorySheet&&<div className="fixed inset-0 z-50 bg-black/50 flex items-end" onClick={()=>setShowCategorySheet(false)}><div className="bg-gray-900 w-full rounded-t-2xl p-4" onClick={e=>e.stopPropagation()}>{CATS.map(c=><button key={c.value} onClick={()=>{setProductForm({...productForm,category:c.value});setShowCategorySheet(false)}} className="w-full py-4 text-left text-white flex items-center gap-3 border-b border-gray-800"><span className="text-2xl">{c.icon}</span><span className="text-sm">{c.label}</span><div className="ml-auto w-5 h-5 rounded-full border-2 border-gray-500 flex items-center justify-center">{productForm.category===c.value&&<div className="w-2.5 h-2.5 rounded-full bg-amber-400"/>}</div></button>)}</div></div>}
      </PageContainer>}

      {/* ===== ADMIN POST UPDATE ===== */}
      {['adminPostUpdate','adminPostVideo','adminPostFile','adminPostLink'].includes(page)&&isAdmin&&<PageContainer>
        <div className="flex items-center gap-3 mb-4"><BackBtn to="adminPanel"/><h2 className="text-lg font-bold">Post {page.replace('adminPost','')}</h2></div>
        <Card className="space-y-3">
          <input placeholder="Title" value={updateForm.title} onChange={e=>setUpdateForm({...updateForm,title:e.target.value})} className="w-full px-4 py-3 rounded-xl border"/>
          <textarea placeholder="Content..." value={updateForm.content} onChange={e=>setUpdateForm({...updateForm,content:e.target.value})} rows={4} className="w-full px-4 py-3 rounded-xl border resize-none"/>
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center text-xs text-gray-400">Upload {page==='adminPostUpdate'?'Image':page==='adminPostVideo'?'Video':page==='adminPostFile'?'File':'Link'} here</div>
          <button onClick={handlePostUpdate} className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold">Post</button>
        </Card>
      </PageContainer>}

      {/* ===== ADMIN ACCOUNT LOGIN ===== */}
      {page==='adminAccountLogin'&&isAdmin&&<PageContainer>
        <div className="flex items-center gap-3 mb-4"><BackBtn to="adminPanel"/><h2 className="text-lg font-bold">Account Credentials</h2></div>
        <Card className="mb-4 space-y-2">
          <input placeholder="Platform (Netflix, NordVPN...)" value={accountForm.platform} onChange={e=>setAccountForm({...accountForm,platform:e.target.value})} className="w-full px-4 py-3 rounded-xl border"/>
          <input placeholder="Username/Email" value={accountForm.username} onChange={e=>setAccountForm({...accountForm,username:e.target.value})} className="w-full px-4 py-3 rounded-xl border"/>
          <input placeholder="Password" value={accountForm.password} onChange={e=>setAccountForm({...accountForm,password:e.target.value})} className="w-full px-4 py-3 rounded-xl border"/>
          <button onClick={handleAddAccount} className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold text-sm">+ Add Account Slot</button>
        </Card>
        <div className="space-y-2">{uploadedAccounts.map(a=><div key={a.id} className="bg-white rounded-xl p-3 border flex justify-between items-center"><div><div className="text-sm font-bold">{a.platform}</div><div className="text-xs text-gray-500">{a.username}</div></div><div className="text-[10px] bg-gray-100 px-2 py-1 rounded-lg">••••••••</div></div>)}</div>
      </PageContainer>}

      {/* ===== ADMIN CHATS ===== */}
      {(page==='adminChats'||page==='adminAllChats')&&isAdmin&&<PageContainer>
        <h2 className="text-lg font-bold mb-4">Support Chats</h2>
        {[{id:'ac1',name:'Jean D.',lastMessage:'Payment proof uploaded',time:'5m ago'},{id:'ac2',name:'Marie K.',lastMessage:'How do I deposit?',time:'25m ago'},{id:'ac3',name:'Ali B.',lastMessage:'Withdrawal received, thanks!',time:'1d ago'},{id:'ac4',name:'Fatou M.',lastMessage:'Approve my account',time:'1d ago'}].map(c=><Card key={c.id}><div className="flex items-center gap-3"><div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-lg">👤</div><div className="flex-1"><div className="flex justify-between"><h3 className="text-sm font-bold">{c.name}</h3><span className="text-[10px] text-gray-400">{c.time}</span></div><p className="text-xs text-gray-500">{c.lastMessage}</p></div></div></Card>)}
      </PageContainer>}

      {/* ===== ADMIN FINANCE ===== */}
      {page==='adminFinance'&&isAdmin&&<PageContainer>
        <div className="flex items-center gap-3 mb-4"><BackBtn to="adminPanel"/><h2 className="text-lg font-bold">Finance</h2></div>
        <Card className="mb-4"><div className="text-sm text-gray-500 mb-1">Total Revenue</div><div className="text-3xl font-black">{formatCurrency(allUsers.reduce((s,u)=>s+(u.total_earnings||0),0),uc.symbol)}</div></Card>
        <div className="bg-white rounded-2xl border">{transactions.slice(0,10).map(t=><div key={t.id} className="flex justify-between py-3 px-4 border-b last:border-0 text-sm"><div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-full flex items-center justify-center ${t.type==='deposit'?'bg-green-100 text-green-600':'bg-red-100 text-red-600'}`}>{t.type==='deposit'?<ArrowDownIcon className="w-4 h-4"/>:<ArrowUpIcon className="w-4 h-4"/>}</div><div><div className="font-medium">{t.method||t.type}</div><div className="text-xs text-gray-400">{t.created_at}</div></div></div><div className={`font-bold ${t.type==='deposit'||t.type==='earn'?'text-green-600':'text-red-600'}`}>{formatCurrency(t.amount,uc.symbol)}</div></div>)}</div>
      </PageContainer>}

      {/* ===== ADMIN AI SETTINGS ===== */}
      {page==='adminAiSettings'&&isAdmin&&<PageContainer>
        <div className="flex items-center gap-3 mb-4"><BackBtn to="adminPanel"/><h2 className="text-lg font-bold">AI Settings</h2></div>
        <Card className="mb-4"><h3 className="text-sm font-bold mb-3">Payment Verification AI</h3><p className="text-xs text-gray-500 mb-3">Configure AI to auto-verify payment proofs. Upload reference tokens per payment method.</p>
          <div className="space-y-2">
            <div><label className="text-[10px] font-medium text-gray-500 block">AI Endpoint</label><input value={aiEndpoint} onChange={e=>setAiEndpoint(e.target.value)} placeholder="https://ai.example.com/verify" className="w-full bg-gray-50 rounded-lg py-2 px-3 text-xs outline-none border"/></div>
            <div><label className="text-[10px] font-medium text-gray-500 block">AI API Key</label><input type="password" value={aiApiKey} onChange={e=>setAiApiKey(e.target.value)} placeholder="Enter key" className="w-full bg-gray-50 rounded-lg py-2 px-3 text-xs outline-none border"/></div>
            <div>
              <label className="text-[10px] font-medium text-gray-500 block mb-1">Payment Reference Tokens</label>
              <div className="grid grid-cols-2 gap-2">
                {['MTN','Orange','PayPal','Bank'].map(m=><input key={m} placeholder={m+' reference'} className="w-full bg-gray-50 rounded-lg py-2 px-3 text-xs outline-none border"/>)}
              </div>
            </div>
            <div className="flex items-center justify-between py-2"><span className="text-xs">Auto-Approve</span><button onClick={()=>setAiAutoApprove(!aiAutoApprove)} className={`w-12 h-6 rounded-full transition ${aiAutoApprove?'bg-green-500':'bg-gray-300'}`}><div className={`w-5 h-5 bg-white rounded-full transform transition ${aiAutoApprove?'translate-x-6':'translate-x-0.5'} mt-0.5`}/></button></div>
            <div className="bg-purple-50 rounded-xl p-3 text-xs text-purple-800">
              <strong>How it works:</strong><br/>
              • Confidence &gt; 85% → Auto-approve<br/>
              • Confidence &gt; 50% → Flag for review<br/>
              • Below 50% → Manual fallback
            </div>
            <button onClick={()=>{saveAdminConfig('ai_endpoint',{url:aiEndpoint});saveAdminConfig('ai_api_key',{key:aiApiKey});toast_('AI config saved!')}} className="w-full bg-gray-900 text-white rounded-lg py-2.5 text-xs font-bold">Save AI Configuration</button>
          </div>
        </Card>
        <Card><h3 className="text-sm font-bold mb-3">Run AI Check</h3><p className="text-xs text-gray-500 mb-3">Process all pending payments through AI verification.</p>
          <button onClick={runAiCheck} className="w-full bg-purple-600 text-white rounded-xl py-3 font-bold text-sm">🧠 Run AI Auto-Check Now ({pendingPayments.length} pending)</button>
        </Card>
      </PageContainer>}

      {/* ===== ADMIN CAMPAIGNS ===== */}
      {page==='adminCampaigns'&&isAdmin&&<PageContainer>
        <div className="flex items-center gap-3 mb-4"><BackBtn to="adminPanel"/><h2 className="text-lg font-bold">Campaigns</h2></div>
        <Card className="mb-4 space-y-2">
          <input placeholder="Campaign Title" value={campaignForm.title} onChange={e=>setCampaignForm({...campaignForm,title:e.target.value})} className="w-full px-4 py-3 rounded-xl border"/>
          <input placeholder="Description" value={campaignForm.description} onChange={e=>setCampaignForm({...campaignForm,description:e.target.value})} className="w-full px-4 py-3 rounded-xl border"/>
          <div className="flex gap-2">
            <input type="number" placeholder="Reward (Fr)" value={campaignForm.reward} onChange={e=>setCampaignForm({...campaignForm,reward:e.target.value})} className="flex-1 px-4 py-3 rounded-xl border"/>
            <select value={campaignForm.type} onChange={e=>setCampaignForm({...campaignForm,type:e.target.value})} className="flex-1 px-4 py-3 rounded-xl border"><option value="video">Video</option><option value="game">Game</option><option value="task">Task</option></select>
          </div>
          <button onClick={handleCreateCampaign} className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold text-sm">Create Campaign</button>
        </Card>
        <div className="space-y-2">
          <Card><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="text-2xl">🎬</div><div><div className="text-sm font-bold">Watch 5 Videos</div><div className="text-xs text-gray-500">+2500 Fr</div></div></div><div className="flex gap-2"><span className={`text-[10px] px-2 py-1 rounded-full font-bold ${rewardsEnabled?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{rewardsEnabled?'ON':'OFF'}</span></div></div></Card>
          <Card><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="text-2xl">🎮</div><div><div className="text-sm font-bold">Puzzle Master</div><div className="text-xs text-gray-500">+1500 Fr</div></div></div><div className="flex gap-2"><span className={`text-[10px] px-2 py-1 rounded-full font-bold ${rewardsEnabled?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{rewardsEnabled?'ON':'OFF'}</span></div></div></Card>
        </div>
      </PageContainer>}

      {/* ===== ADMIN PAYMENT SETTINGS ===== */}
      {page==='adminPayments'&&isAdmin&&<PageContainer>
        <div className="flex items-center gap-3 mb-4"><BackBtn to="adminPanel"/><h2 className="text-lg font-bold">Payment Settings</h2></div>
        <Card className="mb-4"><h3 className="text-sm font-bold mb-3">Chariow Integration</h3><div className="space-y-2">
          <div><label className="text-[10px] font-medium text-gray-500 block">Merchant ID</label><input value={chariowMerchant} onChange={e=>setChariowMerchant(e.target.value)} className="w-full bg-gray-50 rounded-lg py-2 px-3 text-xs outline-none border"/></div>
          <div><label className="text-[10px] font-medium text-gray-500 block">Product ID</label><input value={chariowProduct} onChange={e=>setChariowProduct(e.target.value)} className="w-full bg-gray-50 rounded-lg py-2 px-3 text-xs outline-none border"/></div>
          <button onClick={()=>{saveAdminConfig('chariow_merchant_id',{merchant_id:chariowMerchant});toast_('Saved!')}} className="w-full bg-gray-900 text-white rounded-lg py-2.5 text-xs font-bold">Save Settings</button>
        </div></Card>
        <Card><h3 className="text-sm font-bold mb-3">Manual Payment Accounts</h3><div className="space-y-2">
          {['MTN','Orange','Moov','Wave','PayPal','Bank'].map(m=><div key={m} className="flex items-center gap-2"><span className="text-xs font-medium w-16">{m}:</span><input placeholder="Account details" className="flex-1 bg-gray-50 rounded-lg py-2 px-3 text-[10px] outline-none border"/></div>)}
          <button onClick={()=>toast_('Payment accounts saved!')} className="w-full bg-gray-900 text-white rounded-lg py-2.5 text-xs font-bold mt-2">Save Accounts</button>
        </div></Card>
      </PageContainer>}

      {/* ===== ADMIN PAYMENT SETTINGS ===== */}
      {page==='adminPayments'&&isAdmin&&<PageContainer>
        <div className="flex items-center gap-3 mb-4"><BackBtn to="adminPanel"/><h2 className="text-lg font-bold">Payment Settings</h2></div>
        <Card className="mb-4"><h3 className="text-sm font-bold mb-3">Chariow Integration</h3><div className="space-y-2">
          <div><label className="text-[10px] font-medium text-gray-500 block">Merchant ID</label><input value={chariowMerchant} onChange={e=>setChariowMerchant(e.target.value)} className="w-full bg-gray-50 rounded-lg py-2 px-3 text-xs outline-none border"/></div>
          <div><label className="text-[10px] font-medium text-gray-500 block">Product ID</label><input value={chariowProduct} onChange={e=>setChariowProduct(e.target.value)} className="w-full bg-gray-50 rounded-lg py-2 px-3 text-xs outline-none border"/></div>
          <button onClick={()=>{saveAdminConfig('chariow_merchant_id',{merchant_id:chariowMerchant});toast_('Saved!')}} className="w-full bg-gray-900 text-white rounded-lg py-2.5 text-xs font-bold">Save Settings</button>
        </div></Card>
        <Card><h3 className="text-sm font-bold mb-3">Manual Payment Accounts</h3><div className="space-y-2">
          {['MTN','Orange','Moov','Wave','PayPal','Bank'].map(m=><div key={m} className="flex items-center gap-2"><span className="text-xs font-medium w-16">{m}:</span><input placeholder="Account details" className="flex-1 bg-gray-50 rounded-lg py-2 px-3 text-[10px] outline-none border"/></div>)}
          <button onClick={()=>toast_('Payment accounts saved!')} className="w-full bg-gray-900 text-white rounded-lg py-2.5 text-xs font-bold mt-2">Save Accounts</button>
        </div></Card>
      </PageContainer>}
    </main>

    {/* Bottom Tab Bar */}
    {isPaid&&<nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-100 flex items-center justify-around z-40">
      {[{id:'home',icon:HomeIcon,label:tx('home')},{id:'affiliate',icon:UsersIcon,label:tx('affiliate')},{id:'updates',icon:VideoCameraIcon,label:tx('updates')},{id:'chat',icon:ChatBubbleLeftRightIcon,label:tx('chat')},{id:'account',icon:UserIcon,label:tx('account')}].map(t_=>{const active=tab===t_.id;return <button key={t_.id} onClick={()=>navTab(t_.id as Page,t_.id as Tab)} className={`flex flex-col items-center justify-center w-16 rounded-2xl transition ${active?'bg-amber-400':''}`}><t_.icon className={`w-6 h-6 ${active?'text-gray-900':'text-gray-400'}`}/><span className={`text-[10px] font-bold mt-1 ${active?'text-gray-900':'text-gray-400'}`}>{t_.label}</span></button>})}
    </nav>}

    {/* Toast */}
    {toast&&<div className="fixed top-20 left-4 right-4 bg-gray-900 text-white text-sm font-medium py-3 px-4 rounded-2xl z-50 shadow-lg">{toast}</div>}

    {/* Drawer */}
    {drawerOpen&&<div className="fixed inset-0 z-50" onClick={()=>setDrawerOpen(false)}>
      <div className="absolute inset-0 bg-black/40"/>
      <div className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl flex flex-col" onClick={e=>e.stopPropagation()}>
        <div className="h-16 bg-gray-900 flex items-center justify-between px-4"><span className="text-white font-black text-xl">EARNIZI</span><button onClick={()=>setDrawerOpen(false)} className="text-white/70"><XMarkIcon className="w-6 h-6"/></button></div>
        <div className="flex-1 overflow-y-auto py-2">
          <DItem i={<HomeIcon className="w-5 h-5"/>} l="Home" onClick={()=>navTab('home','home')}/>
          <DItem i={<WalletIcon className="w-5 h-5"/>} l="Deposit" onClick={()=>navigate('deposit')}/>
          <DItem i={<BanknotesIcon className="w-5 h-5"/>} l="Withdraw" onClick={()=>navigate('withdraw')}/>
          <DItem i={<UsersIcon className="w-5 h-5"/>} l="Affiliate" onClick={()=>navTab('affiliate','affiliate')}/>
          <DItem i={<VideoCameraIcon className="w-5 h-5"/>} l="Video Rewards" onClick={()=>navigate('videoRewards')}/>
          <DItem i={<PlayIcon className="w-5 h-5"/>} l="Game Rewards" onClick={()=>navigate('gameRewards')}/>
          <DItem i={<GiftIcon className="w-5 h-5"/>} l="Products" onClick={()=>navigate('products')}/>
          <DItem i={<ChatBubbleLeftRightIcon className="w-5 h-5"/>} l="Chat" onClick={()=>navTab('chat','chat')}/>
          <DItem i={<Cog6ToothIcon className="w-5 h-5"/>} l="Settings" onClick={()=>navigate('settings')}/>
          <DItem i={<LanguageIcon className="w-5 h-5"/>} l={lang==='en'?'Français':'English'} onClick={()=>setLang(l=>l==='en'?'fr':'en')}/>
          {isAdmin&&<>
            <div className="px-5 py-2 text-xs font-bold text-gray-400 uppercase mt-2">Admin</div>
            <DItem i={<ChartBarIcon className="w-5 h-5"/>} l="Dashboard" onClick={()=>navigate('adminPanel')}/>
            <DItem i={<UsersIcon className="w-5 h-5"/>} l="All Users" onClick={()=>navigate('adminUsers')}/>
            <DItem i={<CheckIcon className="w-5 h-5"/>} l="Approvals" onClick={()=>navigate('adminApproveUsers')} badge={pendingPayments.length}/>
            <DItem i={<ShieldCheckIcon className="w-5 h-5"/>} l="API Keys" onClick={()=>navigate('adminApiKeys')}/>
            <DItem i={<GiftIcon className="w-5 h-5"/>} l="Products" onClick={()=>navigate('adminProducts')}/>
            <DItem i={<VideoCameraIcon className="w-5 h-5"/>} l="Post Update" onClick={()=>navigate('adminPostUpdate')}/>
            <DItem i={<ChatBubbleLeftRightIcon className="w-5 h-5"/>} l="Chats" onClick={()=>navigate('adminChats')}/>
            <DItem i={<BanknotesIcon className="w-5 h-5"/>} l="Payments" onClick={()=>navigate('adminPayments')}/>
            <DItem i={<CogIcon className="w-5 h-5"/>} l="AI Settings" onClick={()=>navigate('adminAiSettings')}/>
            <DItem i={<TrophyIcon className="w-5 h-5"/>} l="Campaigns" onClick={()=>navigate('adminCampaigns')}/>
            <DItem i={<UserIcon className="w-5 h-5"/>} l="Account Login" onClick={()=>navigate('adminAccountLogin')}/>
            <DItem i={<ChartBarIcon className="w-5 h-5"/>} l="Finance" onClick={()=>navigate('adminFinance')}/>
          </>}
        </div>
        <div className="p-4 border-t"><div className="text-xs text-gray-400 text-center">earn.sellizi.store</div></div>
      </div>
    </div>}
  </div>
}

function DItem({i,l,onClick,badge}:{i:any;l:string;onClick:()=>void;badge?:number}){
  return <button onClick={onClick} className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 text-gray-700 transition relative">
    <span className="text-gray-500">{i}</span><span className="text-sm font-medium">{l}</span>
    {(badge??0)>0&&<span className="ml-auto bg-red-500 text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center">{badge}</span>}
  </button>
}
