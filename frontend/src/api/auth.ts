import client from './client'
import type { LoginRequest, RegisterRequest, TokenResponse } from '../types'

export async function login(data: LoginRequest): Promise<TokenResponse> {
  const res = await client.post<TokenResponse>('/auth/login', data)
  return res.data
}

export async function register(data: RegisterRequest): Promise<TokenResponse> {
  const res = await client.post<TokenResponse>('/auth/register', data)
  return res.data
}
