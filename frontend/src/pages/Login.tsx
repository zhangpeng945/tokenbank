import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Landmark,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { login, register } from '../api/auth'
import { getErrorMessage } from '../api/client'

export default function Login() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res =
        tab === 'login'
          ? await login({ email, password })
          : await register({ email, password })

      localStorage.setItem('tokenbank_token', res.access_token)
      localStorage.setItem(
        'tokenbank_user',
        JSON.stringify({ id: res.user_id, email: res.email, role: res.role }),
      )
      navigate('/dashboard')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2">
            <Landmark className="h-8 w-8 text-indigo-600" />
            <span className="text-2xl font-bold text-gray-900">TokenBank</span>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            LLM API Token Sharing Platform
          </p>
        </div>

        <div className="card p-8">
          {/* Tabs */}
          <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => {
                setTab('login')
                setError('')
              }}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                tab === 'login'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('register')
                setError('')
              }}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                tab === 'register'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="label-text" htmlFor="email">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="input-field pl-10"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="label-text" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                  className="input-field pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Please wait...
                </>
              ) : (
                tab === 'login' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          By continuing, you agree to TokenBank's Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  )
}
