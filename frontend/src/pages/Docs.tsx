import { useState } from 'react'
import {
  BookOpen,
  KeyRound,
  Terminal,
  Copy,
  Check,
  Zap,
  Shield,
  Code2,
  AlertTriangle,
} from 'lucide-react'

type CodeTab = 'curl' | 'python' | 'javascript'

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

const STREAM_PYTHON = `from openai import OpenAI

client = OpenAI(
    api_key="YOUR_API_KEY",
    base_url="http://localhost:8000/v1",
)

stream = client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Tell me a story"}],
    stream=True,
)

for chunk in stream:
    print(chunk.choices[0].delta.content or "", end="")`

const STREAM_JS = `import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: 'YOUR_API_KEY',
  baseURL: 'http://localhost:8000/v1',
})

const stream = await client.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Tell me a story' }],
  stream: true,
})

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '')
}`

export default function Docs() {
  const [codeTab, setCodeTab] = useState<CodeTab>('curl')
  const [streamTab, setStreamTab] = useState<'python' | 'javascript'>('python')
  const [copied, setCopied] = useState(false)

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

  const streamExamples: Record<'python' | 'javascript', string> = {
    python: STREAM_PYTHON,
    javascript: STREAM_JS,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">API Documentation</h1>
        <p className="mt-1 text-sm text-gray-500">
          Learn how to integrate TokenBank into your applications
        </p>
      </div>

      {/* Getting Started */}
      <div className="card p-6">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-900">Getting Started</h2>
        </div>
        <div className="mt-4 space-y-3 text-sm text-gray-600">
          <p>
            TokenBank provides an OpenAI-compatible proxy that lets you route
            LLM API requests through a shared token bank. You can deposit
            credits, transfer to other users, and earn interest on idle
            balances.
          </p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Create an API key from the{' '}
              <span className="font-medium text-indigo-600">API Keys</span>{' '}
              page.
            </li>
            <li>Copy the generated key — it is only shown once.</li>
            <li>
              Use the key with any OpenAI SDK, pointing the{' '}
              <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">
                base_url
              </code>{' '}
              to the TokenBank proxy.
            </li>
            <li>Monitor usage and costs on the Dashboard and Usage pages.</li>
          </ol>
        </div>
      </div>

      {/* Authentication */}
      <div className="card p-6">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Authentication
          </h2>
        </div>
        <div className="mt-4 space-y-3 text-sm text-gray-600">
          <p>
            Every API request must include your API key in the{' '}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">
              Authorization
            </code>{' '}
            header as a Bearer token:
          </p>
          <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-sm text-slate-100">
            <code>{'Authorization: Bearer tbk_live_xxxxxxxxxxxxxxxxxxxx'}</code>
          </pre>
          <p className="flex items-start gap-2 text-amber-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>
              Never share your API key publicly or commit it to version control.
              Treat it like a password.
            </span>
          </p>
        </div>
      </div>

      {/* Chat Completions */}
      <div className="card overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-indigo-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Chat Completions
              </h2>
              <p className="mt-0.5 text-sm text-gray-500">
                <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">
                  POST /v1/chat/completions
                </code>
              </p>
            </div>
          </div>
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

      {/* Streaming */}
      <div className="card overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-indigo-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Streaming Responses
              </h2>
              <p className="mt-0.5 text-sm text-gray-500">
                Set{' '}
                <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">
                  stream: true
                </code>{' '}
                to receive chunks as they arrive
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-1 border-b border-gray-200 bg-gray-50 px-4 pt-3">
          {(['python', 'javascript'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setStreamTab(t)}
              className={`rounded-t-lg px-4 py-2 text-sm font-medium transition ${
                streamTab === t
                  ? 'border-b-2 border-indigo-600 bg-white text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'python' ? 'Python' : 'JavaScript'}
            </button>
          ))}
        </div>

        <pre className="overflow-x-auto bg-slate-900 p-4 text-sm text-slate-100">
          <code>{streamExamples[streamTab]}</code>
        </pre>
      </div>

      {/* Available Models */}
      <div className="card p-6">
        <div className="flex items-center gap-2">
          <Code2 className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Available Models
          </h2>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                  Model
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                  Context
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                  Description
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm">
              <tr>
                <td className="px-4 py-2 font-medium text-gray-900">gpt-4</td>
                <td className="px-4 py-2 text-gray-500">8K</td>
                <td className="px-4 py-2 text-gray-500">
                  High-quality reasoning and generation
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-medium text-gray-900">
                  gpt-4o
                </td>
                <td className="px-4 py-2 text-gray-500">128K</td>
                <td className="px-4 py-2 text-gray-500">
                  Multimodal with extended context
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-medium text-gray-900">
                  gpt-3.5-turbo
                </td>
                <td className="px-4 py-2 text-gray-500">16K</td>
                <td className="px-4 py-2 text-gray-500">
                  Fast and cost-effective
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-medium text-gray-900">
                  claude-3-5-sonnet
                </td>
                <td className="px-4 py-2 text-gray-500">200K</td>
                <td className="px-4 py-2 text-gray-500">
                  Anthropic's flagship model
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-medium text-gray-900">
                  gemini-pro
                </td>
                <td className="px-4 py-2 text-gray-500">32K</td>
                <td className="px-4 py-2 text-gray-500">
                  Google's multimodal model
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-gray-400">
          Model availability depends on the provider keys configured by the
          platform admin. Check the Admin panel for the current list.
        </p>
      </div>

      {/* Error Handling */}
      <div className="card p-6">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Error Handling
          </h2>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                  Status
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                  Meaning
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm">
              <tr>
                <td className="px-4 py-2 font-medium text-gray-900">200</td>
                <td className="px-4 py-2 text-gray-500">
                  Success — request completed normally
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-medium text-gray-900">401</td>
                <td className="px-4 py-2 text-gray-500">
                  Unauthorized — missing or invalid API key
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-medium text-gray-900">402</td>
                <td className="px-4 py-2 text-gray-500">
                  Insufficient balance — deposit more tokens
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-medium text-gray-900">429</td>
                <td className="px-4 py-2 text-gray-500">
                  Rate limited — too many requests
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-medium text-gray-900">500</td>
                <td className="px-4 py-2 text-gray-500">
                  Server error — upstream provider issue
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
