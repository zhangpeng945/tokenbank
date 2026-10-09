import { useEffect, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import {
  KeyRound,
  Users as UsersIcon,
  DollarSign,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Shield,
} from 'lucide-react'
import client, { getErrorMessage } from '../api/client'
import type { PricingResponse, ProviderKeyResponse, AdminUser } from '../types'

type Tab = 'providers' | 'users' | 'pricing'

interface FormMsg {
  ok: boolean
  text: string
}

function extractArray<T>(data: T[] | { items: T[] } | unknown): T[] {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && 'items' in data) {
    return (data as { items: T[] }).items
  }
  return []
}

export default function Admin() {
  const [tab, setTab] = useState<Tab>('providers')
  const [error, setError] = useState('')

  // Provider keys
  const [providerKeys, setProviderKeys] = useState<ProviderKeyResponse[]>([])
  const [providerLoading, setProviderLoading] = useState(true)
  const [provider, setProvider] = useState('')
  const [providerName, setProviderName] = useState('')
  const [providerKeyValue, setProviderKeyValue] = useState('')
  const [providerCreating, setProviderCreating] = useState(false)
  const [providerMsg, setProviderMsg] = useState<FormMsg | null>(null)
  const [deletingProviderId, setDeletingProviderId] = useState<number | null>(null)

  // Users
  const [users, setUsers] = useState<AdminUser[]>([])
  const [usersLoading, setUsersLoading] = useState(true)

  // Pricing
  const [pricing, setPricing] = useState<PricingResponse[]>([])
  const [pricingLoading, setPricingLoading] = useState(true)

  const fetchProviderKeys = async () => {
    try {
      const res = await client.get('/admin/keys')
      setProviderKeys(extractArray<ProviderKeyResponse>(res.data))
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setProviderLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const res = await client.get('/admin/users')
      setUsers(extractArray<AdminUser>(res.data))
    } catch (err) {
      // non-fatal: user tab will just show empty
    } finally {
      setUsersLoading(false)
    }
  }

  const fetchPricing = async () => {
    try {
      const res = await client.get('/admin/pricing')
      setPricing(extractArray<PricingResponse>(res.data))
    } catch (err) {
      // non-fatal
    } finally {
      setPricingLoading(false)
    }
  }

  useEffect(() => {
    fetchProviderKeys()
    fetchUsers()
    fetchPricing()
  }, [])

  const handleCreateProvider = async (e: FormEvent) => {
    e.preventDefault()
    setProviderCreating(true)
    setProviderMsg(null)
    try {
      await client.post('/admin/keys', {
        provider,
        name: providerName,
        key: providerKeyValue,
      })
      setProviderMsg({ ok: true, text: 'Provider key added successfully!' })
      setProvider('')
      setProviderName('')
      setProviderKeyValue('')
      await fetchProviderKeys()
    } catch (err) {
      setProviderMsg({ ok: false, text: getErrorMessage(err) })
    } finally {
      setProviderCreating(false)
    }
  }

  const handleDeleteProvider = async (id: number) => {
    if (!window.confirm('Delete this provider key? Models using this provider may stop working.'))
      return
    setDeletingProviderId(id)
    try {
      await client.delete(`/admin/keys/${id}`)
      await fetchProviderKeys()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setDeletingProviderId(null)
    }
  }

  // Admin guard (after all hooks)
  const userStr = localStorage.getItem('tokenbank_user')
  let currentUser: { id: number; email: string; role: string } | null = null
  try {
    currentUser = userStr ? JSON.parse(userStr) : null
  } catch {
    currentUser = null
  }

  if (currentUser?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  const tabs: { key: Tab; label: string; icon: typeof KeyRound }[] = [
    { key: 'providers', label: 'Provider Keys', icon: KeyRound },
    { key: 'users', label: 'Users', icon: UsersIcon },
    { key: 'pricing', label: 'Pricing', icon: DollarSign },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage provider keys, users, and pricing
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition ${
              tab === key
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Provider Keys tab */}
      {tab === 'providers' && (
        <div className="space-y-4">
          {/* Add form */}
          <div className="card p-6">
            <div className="mb-4 flex items-center gap-2">
              <Plus className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Add Provider Key
              </h2>
            </div>
            <form onSubmit={handleCreateProvider} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="label-text" htmlFor="provider-select">
                    Provider
                  </label>
                  <select
                    id="provider-select"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    required
                    className="input-field"
                  >
                    <option value="">Select...</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="zhipu">Zhipu (GLM)</option>
                  </select>
                </div>
                <div>
                  <label className="label-text" htmlFor="provider-name">
                    Name
                  </label>
                  <input
                    id="provider-name"
                    type="text"
                    value={providerName}
                    onChange={(e) => setProviderName(e.target.value)}
                    placeholder="Production key"
                    required
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label-text" htmlFor="provider-key-value">
                    API Key
                  </label>
                  <input
                    id="provider-key-value"
                    type="password"
                    value={providerKeyValue}
                    onChange={(e) => setProviderKeyValue(e.target.value)}
                    placeholder="sk-..."
                    required
                    className="input-field"
                  />
                </div>
              </div>
              {providerMsg && (
                <div
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                    providerMsg.ok
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {providerMsg.ok ? (
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  )}
                  {providerMsg.text}
                </div>
              )}
              <button
                type="submit"
                disabled={providerCreating}
                className="btn-primary"
              >
                {providerCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Add Key
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Provider keys list */}
          <div className="card overflow-hidden">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Provider Keys
              </h2>
              <p className="text-sm text-gray-500">
                {providerKeys.length} keys configured
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Provider
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {providerLoading ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-8 text-center text-sm text-gray-500"
                      >
                        Loading...
                      </td>
                    </tr>
                  ) : providerKeys.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-8 text-center text-sm text-gray-500"
                      >
                        No provider keys configured
                      </td>
                    </tr>
                  ) : (
                    providerKeys.map((pk) => (
                      <tr key={pk.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3">
                          <span className="inline-flex rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium capitalize text-indigo-700">
                            {pk.provider}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm font-medium text-gray-900">
                          {pk.name}
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                              pk.status === 'active'
                                ? 'bg-green-100 text-green-700'
                                : pk.status === 'cooldown'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {pk.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-3 text-sm text-gray-500">
                          {new Date(pk.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-3 text-right">
                          <button
                            onClick={() => handleDeleteProvider(pk.id)}
                            disabled={deletingProviderId === pk.id}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            {deletingProviderId === pk.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Users tab */}
      {tab === 'users' && (
        <div className="card overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Users</h2>
            <p className="text-sm text-gray-500">{users.length} registered users</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {usersLoading ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-8 text-center text-sm text-gray-500"
                    >
                      Loading...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-8 text-center text-sm text-gray-500"
                    >
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                            {u.email.charAt(0).toUpperCase()}
                          </div>
                          {u.email}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                            u.role === 'admin'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {u.role === 'admin' && (
                            <Shield className="h-3 w-3" />
                          )}
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            u.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-sm text-gray-500">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pricing tab */}
      {tab === 'pricing' && (
        <div className="card overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Pricing</h2>
            <p className="text-sm text-gray-500">
              Token pricing per model (per 1K tokens)
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Model
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">
                    Input / 1K
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">
                    Output / 1K
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Currency
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pricingLoading ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-8 text-center text-sm text-gray-500"
                    >
                      Loading...
                    </td>
                  </tr>
                ) : pricing.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-8 text-center text-sm text-gray-500"
                    >
                      No pricing data available
                    </td>
                  </tr>
                ) : (
                  pricing.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm font-medium text-gray-900">
                        {p.model}
                      </td>
                      <td className="px-6 py-3 text-right text-sm text-gray-500">
                        ${p.input_price_per_1k.toFixed(4)}
                      </td>
                      <td className="px-6 py-3 text-right text-sm text-gray-500">
                        ${p.output_price_per_1k.toFixed(4)}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-500">
                        {p.currency}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
