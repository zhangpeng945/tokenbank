import client from './client'
import type {
  BankBalanceResponse,
  DepositRequest,
  InterestRateResponse,
  Transaction,
  TransferRequest,
} from '../types'

/** GET /api/bank/balance */
export async function getBalance(): Promise<BankBalanceResponse> {
  const res = await client.get<BankBalanceResponse>('/bank/balance')
  return res.data
}

/** POST /api/bank/deposit */
export async function deposit(data: DepositRequest): Promise<{ balance: number; frozen: number; available: number }> {
  const res = await client.post('/bank/deposit', data)
  return res.data
}

/** POST /api/bank/transfer */
export async function transfer(data: TransferRequest): Promise<{ balance: number; frozen: number; transferred: number }> {
  const res = await client.post('/bank/transfer', data)
  return res.data
}

/** GET /api/bank/statement?page=&page_size= */
export async function getStatement(params?: {
  page?: number
  page_size?: number
}): Promise<{ items: Transaction[]; total: number; page: number; page_size: number }> {
  const res = await client.get('/bank/statement', { params })
  return res.data
}

/** GET /api/bank/interest-rate */
export async function getInterestRate(): Promise<InterestRateResponse> {
  const res = await client.get<InterestRateResponse>('/bank/interest-rate')
  return res.data
}
