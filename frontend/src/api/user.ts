import client from './client'
import type {
  ApiKeyResponse,
  BalanceResponse,
  CreateApiKeyRequest,
  Transaction,
  UsageLog,
  UsageSummary,
  UserResponse,
} from '../types'

/** GET /api/user/profile */
export async function getProfile(): Promise<UserResponse> {
  const res = await client.get<UserResponse>('/user/profile')
  return res.data
}

/** GET /api/user/balance */
export async function getBalance(): Promise<BalanceResponse> {
  const res = await client.get<BalanceResponse>('/user/balance')
  return res.data
}

/** GET /api/user/usage?page=&page_size=&start_date=&end_date= */
export async function getUsage(params?: {
  page?: number
  page_size?: number
  start_date?: string
  end_date?: string
}): Promise<{ items: UsageLog[]; total: number; page: number; page_size: number }> {
  const res = await client.get('/user/usage', { params })
  return res.data
}

/** GET /api/user/usage/summary */
export async function getUsageSummary(): Promise<UsageSummary> {
  const res = await client.get<UsageSummary>('/user/usage/summary')
  return res.data
}

/** GET /api/user/transactions?page=&page_size= */
export async function getTransactions(params?: {
  page?: number
  page_size?: number
}): Promise<{ items: Transaction[]; total: number; page: number; page_size: number }> {
  const res = await client.get('/user/transactions', { params })
  return res.data
}

/** GET /api/user/api-keys */
export async function getApiKeys(): Promise<ApiKeyResponse[]> {
  const res = await client.get<ApiKeyResponse[]>('/user/api-keys')
  return res.data
}

/** POST /api/user/api-keys */
export async function createApiKey(data: CreateApiKeyRequest): Promise<ApiKeyResponse> {
  const res = await client.post<ApiKeyResponse>('/user/api-keys', data)
  return res.data
}

/** DELETE /api/user/api-keys/:id */
export async function deleteApiKey(id: number): Promise<void> {
  await client.delete(`/user/api-keys/${id}`)
}
