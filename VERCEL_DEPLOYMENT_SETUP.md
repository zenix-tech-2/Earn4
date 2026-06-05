# EARNIZI - Vercel Deployment & Setup Guide

## 📁 Project Structure
```
earnizi-app/
├── dist/                  ← Built files (deploy this to Vercel)
├── src/
│   ├── App.tsx           ← Main application (React + Supabase)
│   ├── i18n.ts           ← Translations (EN/FR)
│   ├── lib/
│   │   └── supabase.ts   ← Supabase client
│   ├── components/
│   │   └── icons.tsx     ← All icon components
│   ├── index.css         ← Tailwind CSS
│   └── main.tsx          ← Entry point
├── public/
│   └── manifest.json     ← PWA manifest
├── supabase/
│   └── schema.sql        ← Complete SQL schema
├── index.html
├── vercel.json           ← Vercel routing config
└── VERCEL_DEPLOYMENT_SETUP.md
```

---

## 🚀 DEPLOY TO VERCEL (3 Methods)

### Method 1: Vercel Dashboard (Easiest)

1. Go to https://vercel.com/new
2. Import your Git repository OR upload the `dist/` folder
3. **Framework Preset**: Select "Other"
4. **Root Directory**: Leave as `.` (or select the folder containing the `dist` folder)
5. **Build Command**: Leave empty (already built)
6. **Output Directory**: Set to `dist`
7. Click **Deploy**

Your app will be live at: `https://your-project.vercel.app`

To use your custom domain `earn.sellizi.store`:
- Go to **Settings → Domains**
- Add domain: `earn.sellizi.store`
- Update your DNS:
  - **Type**: A
  - **Name**: @
  - **Value**: `76.76.21.21` (Vercel IP)
  - **Type**: CNAME
  - **Name**: www
  - **Value**: cname.vercel-dns.com

---

### Method 2: Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Set custom domain
vercel domains add earn.sellizi.store
```

---

### Method 3: Drag & Drop

1. Zip the `dist/` folder (rename to `earnizi.zip`)
2. Go to https://vercel.com/dashboard
3. Click **Add New → Project**
4. Drag & drop your ZIP file
5. Click **Deploy**

---

## 🗄️ SUPABASE SETUP

### Step 1: Create Supabase Project
1. Go to https://supabase.com/dashboard
2. Create new project
3. Copy your `SUPABASE_URL` and `SUPABASE_ANON_KEY`

### Step 2: Run SQL Schema
Go to **SQL Editor** and run the complete schema from `supabase/schema.sql`:

```sql
-- Full SQL available in: supabase/schema.sql
-- This creates all tables: profiles, products, transactions, admin_configs, pending_payments, etc.
-- Includes trigger for honestansah@gmail.com auto-admin
```

### Step 3: Enable Google OAuth
Go to **Authentication → Providers → Google**:
1. Enable Google provider
2. Add your Google OAuth credentials
3. Set redirect URL: `https://your-project.vercel.app`

---

## ⚙️ INITIAL SETUP AFTER DEPLOYMENT

### Step 1: Configure Environment
In Vercel Dashboard → Settings → Environment Variables:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### Step 2: First Login as Admin
- **Email**: honestansah@gmail.com
- **Password**: Any (auto-set as admin via SQL trigger)

---

## 🔧 ADMIN PANEL CONFIGURATION

### 1. Configure Rewards API
Navigate: **Admin → API Keys**

**Fill in:**
- **API Endpoint**: `https://api.rapido.com/v1` (or your rewards platform)
- **API Key**: Your rewards platform key
- Toggle **Rewards Enabled**: ON/OFF

### 2. Configure Payment References (for AI)
Navigate: **Admin → AI Settings**

**Add reference images for each method:**
- MTN Mobile Money
- Orange Money
- PayPal
- Bank Transfer

Upload reference screenshots for AI to compare against user payment proofs.

### 3. Create Products
Navigate: **Admin → Products**

All products are FREE. Add:
- Title, Description
- Category (Finance, Marketing, etc.)
- Type (ebook, file, course, etc.)
- Optional link

---

## 📱 PWA INSTALLATION

The app is installable as a PWA:
1. Open in Chrome on mobile/desktop
2. Click **Settings → Install App** button
3. Or use browser's install prompt

**Manifest includes:**
- 192x192 icon
- 512x512 icon
- Standalone display mode
- Theme color: #f59e0b (amber)

---

## 👤 PROFILE EDITING

Navigate: **Settings → Edit Profile**

Fields:
- Full Name
- Username  
- Phone Number
- Country (auto-updates currency)

All changes persist to Supabase `profiles` table.

---

## 💰 PAYMENT SYSTEM

### For Users:
1. **Sign up** with email, username, phone, country
2. **Login** with email/password OR Google
3. **Pay 2300 Fr** (local currency equivalent)
4. **Get approved** (manual or AI auto-approval)
5. **Access unlocked**: Affiliate, Products, Rewards

### For Admin:
- View pending payments in **Admin → Approvals**
- AI auto-checks proofs against references
- Confidence > 85% → Auto-approve
- Confidence > 50% → Flag for review
- Below 50% → Manual fallback

---

## 🌍 COUNTRIES SUPPORTED (33 Total)

### African Countries:
Nigeria, Ghana, Kenya, South Africa, Egypt, Morocco, Ivory Coast, Senegal, Cameroon, Togo, Benin, Mali, Burkina Faso, Niger, Guinea, Rwanda, Tanzania, Uganda, Zambia, Zimbabwe, Ethiopia, Algeria, Tunisia, Angola, Mozambique, DR Congo, Gabon, Congo

### External:
United States, United Kingdom, Canada

Each auto-converts 2300 Fr to local currency.

---

## 📊 AFFILIATE COMMISSIONS

- **Level 1 (Direct)**: 1000 Fr
- **Level 2**: 500 Fr
- **Level 3**: 300 Fr

Track: Clicks, Registered, Active users

---

## 🎮 REWARDS SYSTEM

### Video Rewards
- Admin configures API endpoint
- Users watch videos to earn
- No file uploads - API-driven

### Game Rewards
- Admin configures API endpoint
- Users play games to earn
- No file uploads - API-driven

---

## 🛠️ TECH STACK

- **Frontend**: React 19 + TypeScript + Vite 7
- **Backend**: Supabase (PostgreSQL)
- **Auth**: Email/Password + Google OAuth
- **Styling**: Tailwind CSS v4
- **PWA**: Installable with manifest
- **Deploy**: Vercel

---

## 📞 SUPPORT

**EARNIZI Support:**
- Email: honestansah@gmail.com
- Domain: https://earn.sellizi.store

---

## ✅ QUICK START CHECKLIST

- [ ] Deploy `dist/` to Vercel
- [ ] Add custom domain `earn.sellizi.store`
- [ ] Run `supabase/schema.sql` in Supabase
- [ ] Configure Supabase env vars in Vercel
- [ ] Enable Google OAuth in Supabase
- [ ] Login as admin (honestansah@gmail.com)
- [ ] Set Rewards API endpoint
- [ ] Add payment reference images
- [ ] Create first products
- [ ] Enable rewards (default: ON)
- [ ] Share app link!

---

## 🎉 YOU'RE READY!

Deploy the `dist/` folder to Vercel and EARNIZI will be live at **https://earn.sellizi.store**