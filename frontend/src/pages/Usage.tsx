import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Zap,
  DollarSign,
  Activity,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  BarChart3,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import StatCard from '../components/StatCard'
import { getUsage, getUsageSummary } from '../api/user'
import { getErrorMessage } from '../api/client'
import type { UsageLog, UsageSummary } from '../types'

const PAGE_SIZE = 10

export default function Usage() {
  const [logs, setLogs] = useState<UsageLog[]>([])
  const [total, setTotal] = useState(0)
  const [summary, setSummary] = useState<UsageSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)

  // Date range — default to last 30 days
  const defaultEnd = new Date().toISOString().split('T')[0]
  const defaultStart = new Date()
  defaultStart.setDate(defaultStart.getDate() - 30)

  const [startDate, setStartDate] = useState(
    defaultStart.toISOString().split('T')[0],
  )
  const [endDate, setEndDate] = useState(defaultEnd)

  const fetchUsage = async (pageNum: number, start: string, end: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await getUsage({
        page: pageNum,
        page_size: PAGE_SIZE,
        start_date: `${start}T00:00:00`,
        end_date: `${end}T23:59:59`,
      })
      setLogs(res.items)
      setTotal(res.total)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Fetch all-time summary for stat cards + chart
    getUsageSummary()
      .then(setSummary)
      .catch(() => {})
    // Fetch first page of usage logs
    fetchUsage(1, startDate, endDate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Model chart data from summary (all-time)
  const modelData = useMemo(() => {
    if (!summary) return []
    return Object.entries(summary.by_model)
      .map(([model, tokens]) => ({ model, tokens }))
      .sort((a, b) => b.tokens - a.tokens)
  }, [summary])

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1

  const handleFilter = (e: FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchUsage(1, startDate, endDate)
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    fetchUsage(newPage, startDate, endDate)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Usage Analytics</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track your API consumption and costs
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Tokens"
          value={
            summary
              ? summary.total_tokens.toLocaleString()
              : '--'
          }
          icon={Zap}
          subtitle="all-time usage"
          loading={loading && !summary}
          iconColor="text-amber-600"
        />
        <StatCard
          label="Total Cost"
          value={summary ? `$${summary.total_cost.toFixed(4)}` : '--'}
          icon={DollarSign}
          subtitle="all models"
          loading={loading && !summary}
          iconColor="text-green-600"
        />
        <StatCard
          label="Total Requests"
          value={
            summary
              ? summary.total_requests.toLocaleString()
              : '--'
          }
          icon={Activity}
          subtitle="all-time API calls"
          loading={loading && !summary}
          iconColor="text-blue-600"
        />
      </div>

      {/* Date range filter */}
      <div className="card p-4">
        <form
          onSubmit={handleFilter}
          className="flex flex-wrap items-end gap-4"
        >
          <div>
            <label className="label-text" htmlFor="start-date">
              Start Date
            </label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-text" htmlFor="end-date">
              End Date
            </label>
            <input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-field"
            />
          </div>
          <button type="submit" className="btn-primary">
            Apply Filter
          </button>
        </form>
      </div>

      {/* Model chart */}
      <div className="card p-6">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-indigo-600" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Usage by Model
            </h2>
            <p className="text-sm text-gray-500">
              Token consumption per model (all-time)
            </p>
          </div>
        </div>
        <div className="h-72">
          {modelData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-400">
              No usage data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={modelData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="model"
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                  angle={-15}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                  }}
                  formatter={(value: number) => [
                    value.toLocaleString(),
                    'Tokens',
                  ]}
                />
                <Bar dataKey="tokens" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Usage table */}
      <div className="card overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Usage Logs</h2>
          <p className="text-sm text-gray-500">
            {total} records in selected period
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
                  Prompt
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">
                  Completion
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">
                  Total
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">
                  Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Provider
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-8 text-center text-sm text-gray-500"
                  >
                    Loading...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-8 text-center text-sm text-gray-500"
                  >
                    No usage logs for this period
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">
                      {log.model}
                    </td>
                    <td className="px-6 py-3 text-right text-sm text-gray-500">
                      {log.prompt_tokens.toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-right text-sm text-gray-500">
                      {log.completion_tokens.toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                      {log.total_tokens.toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-right text-sm text-gray-500">
                      ${log.cost.toFixed(4)}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500">
                      {log.provider || '--'}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          log.status === 'success'
                            ? 'bg-green-100 text-green-700'
                            : log.status === 'partial'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-sm text-gray-500">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="btn-secondary"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
              className="btn-secondary"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
