// ===== Auth =====

export interface TokenResponse {
  access_token: string
  token_type: string
  user_id: number
  email: string
  role: 'user' | 'admin'
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
}

// ===== User =====

export interface UserResponse {
  id: number
  email: string
  role: 'user' | 'admin'
  status: 'active' | 'suspended' | 'deleted'
  created_at: string
}

// ===== Balance =====

export interface BalanceResponse {
  balance: number
  credit_limit: number
  frozen: number
  available: number
  daily_limit: number
  monthly_limit: number
  used_today: number
  used_this_month: number
}

export interface BankBalanceResponse {
  balance: number
  credit_limit: number
  frozen: number
  available: number
  interest_rate: number
  debt_interest_rate: number
}

// ===== Transactions =====

export type TransactionType =
  | 'deposit'
  | 'withdraw'
  | 'borrow'
  | 'repay'
  | 'transfer_in'
  | 'transfer_out'
  | 'interest'

export interface Transaction {
  id: number
  type: TransactionType
  amount: number
  balance_after: number
  related_user_id: number | null
  description: string | null
  created_at: string
}

export interface TransactionListResponse {
  items: Transaction[]
  total: number
  page: number
  page_size: number
}

// ===== Usage =====

export type UsageStatus = 'success' | 'failed' | 'partial'

export interface UsageLog {
  id: number
  provider: string
  model: string
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  cost: number
  latency_ms: number
  status: UsageStatus
  error_message: string | null
  created_at: string
}

export interface UsageListResponse {
  items: UsageLog[]
  total: number
  page: number
  page_size: number
}

export interface UsageSummary {
  total_tokens: number
  total_cost: number
  total_requests: number
  by_model: Record<string, number>
  by_provider: Record<string, number>
}

// ===== API Keys =====

export interface ApiKeyResponse {
  id: number
  name: string
  key: string | null
  last_used_at: string | null
  is_active: boolean
  created_at: string
}

export interface CreateApiKeyRequest {
  name: string
}

// ===== Bank =====

export interface DepositRequest {
  amount: number
  description?: string
}

export interface TransferRequest {
  to_email: string
  amount: number
  description?: string
}

export interface InterestRateResponse {
  interest_rate: number
  debt_interest_rate: number
  credit_limit: number
}

export interface DepositResponse {
  balance: number
  frozen: number
  available: number
}

export interface TransferResponse {
  balance: number
  frozen: number
  transferred: number
}

// ===== Admin =====

export interface ProviderKeyResponse {
  id: number
  provider: 'openai' | 'anthropic' | 'zhipu'
  name: string
  status: 'active' | 'cooldown' | 'disabled'
  priority: number
  weight: number
  daily_limit: number
  monthly_limit: number
  requests_today: number
  tokens_today: number
  cooldown_until: string | null
  last_error: string | null
  created_at: string
}

export interface AdminStats {
  total_users: number
  total_keys: number
  active_keys: number
  total_tokens_consumed: number
  total_cost: number
  total_balance: number
}

export interface AdminUser {
  id: number
  email: string
  role: 'user' | 'admin'
  status: 'active' | 'suspended' | 'deleted'
  created_at: string
}

export interface PricingResponse {
  id: number
  provider: string
  model: string
  input_price_per_1k: number
  output_price_per_1k: number
  currency: string
  updated_at: string
}

export interface CreateProviderKeyRequest {
  provider: 'openai' | 'anthropic' | 'zhipu'
  key: string
  name?: string
  priority?: number
  weight?: number
  daily_limit?: number
  monthly_limit?: number
}

export interface CreatePricingRequest {
  provider: string
  model: string
  input_price_per_1k: number
  output_price_per_1k: number
  currency?: string
}

// ===== Common =====

export interface ApiError {
  detail: string
}
