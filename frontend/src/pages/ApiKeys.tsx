import { useEffect, useState, type FormEvent } from 'react'
import {
  KeyRound,
  Plus,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  Code2,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react'
import { getApiKeys, createApiKey, deleteApiKey } from '../api/user'
import { getErrorMessage } from '../api/client'
import type { ApiKeyResponse } from '../types'

const EXAMPLE_CURL = `curl -X POST http://localhost:8000/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "model": "gpt-4",
    "messages": [
      {"role": "user", "content": "Hello, world!"}
    ]
  }'`

const EXAMPLE_PYTHON = `from openai import OpenAI

client = OpenAI(
    api_key="YOUR_API_KEY",
    base_url="http://localhost:8000/v1",
)

response = client.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "user", "content": "Hello, world!"}
    ],
)

print(response.choices[0].message.content)`

const EXAMPLE_JS = `import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: 'YOUR_API_KEY',
  baseURL: 'http://localhost:8000/v1',
})

const response = await client.chat.completions.create({
  model: 'gpt-4',
  messages: [
    { role: 'user', content: 'Hello, world!' }
  ],
})

console.log(response.choices[0].message.content)`

type CodeTab = 'curl' | 'python' | 'javascript'

export default function ApiKeys() {
  const [keys, setKeys] = useState<ApiKeyResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Create form
  const [keyName, setKeyName] = useState('')
  const [creating, setCreating] = useState(false)

  // Newly created key
  const [newKey, setNewKey] = useState<string | null>(null)
  const [newKeyName, setNewKeyName] = useState('')
  const [copied, setCopied] = useState(false)

  // Delete state
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // Code tab
  const [codeTab, setCodeTab] = useState<CodeTab>('curl')

  const fetchKeys = async () => {
    try {
      const data = await getApiKeys()
      setKeys(data)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchKeys()
  }, [])

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError('')
    try {
      const created = await createApiKey({ name: keyName })
      setNewKey(created.key)
      setNewKeyName(keyName)
      setKeyName('')
      await fetchKeys()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this API key? This action cannot be undone.')) return
    setDeletingId(id)
    try {
      await deleteApiKey(id)
      await fetchKeys()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setDeletingId(null)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const codeExamples: Record<CodeTab, string> = {
    curl: EXAMPLE_CURL,
    python: EXAMPLE_PYTHON,
    javascript: EXAMPLE_JS,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage keys for accessing the TokenBank LLM proxy
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Newly created key banner */}
      {newKey && (
        <div className="rounded-xl border-2 border-green-200 bg-green-50 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-green-900">
                API Key "{newKeyName}" created successfully
              </h3>
              <p className="mt-1 text-xs text-green-700">
                Copy this key now. You will not be able to see it again.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <code className="flex-1 truncate rounded-lg bg-white px-3 py-2 text-sm text-gray-900 ring-1 ring-green-200">
                  {newKey}
                </code>
                <button
                  onClick={() => copyToClipboard(newKey)}
                  className="btn-secondary"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-green-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>
            <button
              onClick={() => setNewKey(null)}
              className="text-green-600 hover:text-green-800"
            >
              <EyeOff className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Create key */}
      <div className="card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Plus className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Create New API Key
          </h2>
        </div>
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-4">
          <div className="flex-1">
            <label className="label-text" htmlFor="key-name">
              Key Name
            </label>
            <input
              id="key-name"
              type="text"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="My App Production Key"
              required
              className="input-field"
            />
          </div>
          <button type="submit" disabled={creating} className="btn-primary">
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <KeyRound className="h-4 w-4" />
                Generate Key
              </>
            )}
          </button>
        </form>
      </div>

      {/* Key list */}
      <div className="card overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Your API Keys</h2>
          <p className="text-sm text-gray-500">{keys.length} keys</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Last Used
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
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-sm text-gray-500"
                  >
                    Loading...
                  </td>
                </tr>
              ) : keys.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-sm text-gray-500"
                  >
                    No API keys yet. Create one above to get started.
                  </td>
                </tr>
              ) : (
                keys.map((key) => (
                  <tr key={key.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">
                      {key.name}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500">
                      <code className="rounded bg-gray-100 px-2 py-0.5">
                        #{key.id}
                      </code>
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          key.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {key.is_active ? 'active' : 'disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500">
                      {key.last_used_at
                        ? new Date(key.last_used_at).toLocaleString()
                        : 'Never'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-sm text-gray-500">
                      {new Date(key.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => handleDelete(key.id)}
                        disabled={deletingId === key.id}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingId === key.id ? (
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

      {/* Example usage */}
      <div className="card overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <Code2 className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Example Usage
            </h2>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Use your API key with the OpenAI-compatible proxy endpoint
          </p>
        </div>

        {/* Code tabs */}
        <div className="flex gap-1 border-b border-gray-200 bg-gray-50 px-4 pt-3">
          {(['curl', 'python', 'javascript'] as CodeTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setCodeTab(t)}
              className={`rounded-t-lg px-4 py-2 text-sm font-medium transition ${
                codeTab === t
                  ? 'border-b-2 border-indigo-600 bg-white text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'curl' ? 'cURL' : t === 'python' ? 'Python' : 'JavaScript'}
            </button>
          ))}
        </div>

        <div className="relative">
          <pre className="overflow-x-auto bg-slate-900 p-4 text-sm text-slate-100">
            <code>{codeExamples[codeTab]}</code>
          </pre>
          <button
            onClick={() => copyToClipboard(codeExamples[codeTab])}
            className="absolute right-3 top-3 rounded-lg bg-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-600"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="card flex items-start gap-3 p-4">
        <Eye className="mt-0.5 h-5 w-5 flex-shrink-0 text-indigo-600" />
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Base URL & Authentication
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            All requests should be sent to{' '}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">
              http://localhost:8000/v1
            </code>
            . Include your API key in the{' '}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">
              Authorization: Bearer YOUR_API_KEY
            </code>{' '}
            header. The proxy is OpenAI-compatible, so you can use any OpenAI
            SDK.
          </p>
        </div>
      </div>
    </div>
  )
}
