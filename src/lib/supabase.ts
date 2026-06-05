import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ypzcizmepyqyxmbkinzc.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwemNpem1lcHlxeXhtYmtpbnpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NTk0NzMsImV4cCI6MjA5NjEzNTQ3M30.JVyuBgpg5Sjburtrn1ikKY9PCmXxtk1N1Ow4VhpU4bA'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Types
export interface Profile {
  id: string
  name: string
  username: string
  email: string
  phone: string
  country: string
  currency: string
  balance: number
  total_earnings: number
  is_admin: boolean
  is_paid: boolean
  referral_code: string
  level1_count: number
  level2_count: number
  level3_count: number
  referral_clicks: number
  referred_by?: string
  created_at?: string
  updated_at?: string
}

export interface Product {
  id: string
  title: string
  description: string
  category: string
  icon: string
  is_free: boolean
  link?: string
  platform?: string
  created_at?: string
}

export interface Transaction {
  id: string
  user_id: string
  type: 'deposit' | 'withdraw' | 'earn' | 'payment'
  amount: number
  status: 'pending' | 'completed' | 'rejected'
  method?: string
  reference?: string
  proof_url?: string
  created_at?: string
}

export interface PendingPayment {
  id: string
  user_id: string
  user_name: string
  user_email: string
  amount: number
  method: string
  proof_url?: string
  status: 'pending' | 'approved' | 'rejected'
  ai_confidence?: number
  ai_verified: boolean
  created_at?: string
}

// Countries list with currency mapping
export const COUNTRIES = [
  { code: 'NG', name: 'Nigeria', currency: 'NGN', symbol: '₦', rate: 2300 },
  { code: 'GH', name: 'Ghana', currency: 'GHS', symbol: 'GH₵', rate: 2300 },
  { code: 'KE', name: 'Kenya', currency: 'KES', symbol: 'KSh', rate: 2300 },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR', symbol: 'R', rate: 2300 },
  { code: 'EG', name: 'Egypt', currency: 'EGP', symbol: 'E£', rate: 2300 },
  { code: 'MA', name: 'Morocco', currency: 'MAD', symbol: 'MAD', rate: 2300 },
  { code: 'CI', name: 'Ivory Coast', currency: 'XOF', symbol: 'CFA', rate: 2300 },
  { code: 'SN', name: 'Senegal', currency: 'XOF', symbol: 'CFA', rate: 2300 },
  { code: 'CM', name: 'Cameroon', currency: 'XAF', symbol: 'FCFA', rate: 2300 },
  { code: 'TG', name: 'Togo', currency: 'XOF', symbol: 'CFA', rate: 2300 },
  { code: 'BJ', name: 'Benin', currency: 'XOF', symbol: 'CFA', rate: 2300 },
  { code: 'ML', name: 'Mali', currency: 'XOF', symbol: 'CFA', rate: 2300 },
  { code: 'BF', name: 'Burkina Faso', currency: 'XOF', symbol: 'CFA', rate: 2300 },
  { code: 'NE', name: 'Niger', currency: 'XOF', symbol: 'CFA', rate: 2300 },
  { code: 'GN', name: 'Guinea', currency: 'GNF', symbol: 'FG', rate: 2300 },
  { code: 'RW', name: 'Rwanda', currency: 'RWF', symbol: 'RF', rate: 2300 },
  { code: 'TZ', name: 'Tanzania', currency: 'TZS', symbol: 'TSh', rate: 2300 },
  { code: 'UG', name: 'Uganda', currency: 'UGX', symbol: 'USh', rate: 2300 },
  { code: 'ZM', name: 'Zambia', currency: 'ZMW', symbol: 'ZK', rate: 2300 },
  { code: 'ZW', name: 'Zimbabwe', currency: 'USD', symbol: '$', rate: 2300 },
  { code: 'ET', name: 'Ethiopia', currency: 'ETB', symbol: 'Br', rate: 2300 },
  { code: 'DZ', name: 'Algeria', currency: 'DZD', symbol: 'DA', rate: 2300 },
  { code: 'TN', name: 'Tunisia', currency: 'TND', symbol: 'DT', rate: 2300 },
  { code: 'AO', name: 'Angola', currency: 'AOA', symbol: 'Kz', rate: 2300 },
  { code: 'MZ', name: 'Mozambique', currency: 'MZN', symbol: 'MT', rate: 2300 },
  { code: 'CD', name: 'DR Congo', currency: 'CDF', symbol: 'FC', rate: 2300 },
  { code: 'GA', name: 'Gabon', currency: 'XAF', symbol: 'FCFA', rate: 2300 },
  { code: 'CG', name: 'Congo', currency: 'XAF', symbol: 'FCFA', rate: 2300 },
  { code: 'US', name: 'United States', currency: 'USD', symbol: '$', rate: 1 },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', symbol: '£', rate: 1 },
  { code: 'CA', name: 'Canada', currency: 'CAD', symbol: 'CA$', rate: 1 },
]

export const getCountry = (code: string) => COUNTRIES.find(c => c.code === code) || COUNTRIES[0]
export const formatCurrency = (amount: number, symbol: string) => symbol + amount.toLocaleString('en-US', { minimumFractionDigits: 0 })