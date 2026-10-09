import axios, { AxiosError } from 'axios'

const client = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

// Request interceptor: attach JWT bearer token
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('tokenbank_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// Response interceptor: handle 401 by redirecting to login
client.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('tokenbank_token')
      localStorage.removeItem('tokenbank_user')
      const currentPath = window.location.pathname
      if (currentPath !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

/** Extract a readable error message from an axios error */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { detail?: string; message?: string } | undefined
    if (data?.detail) return data.detail
    if (data?.message) return data.message
    if (error.message) return error.message
  }
  if (error instanceof Error) return error.message
  return 'An unexpected error occurred'
}

export default client
