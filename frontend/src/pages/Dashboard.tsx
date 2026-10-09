import { useEffect, useMemo, useState } from 'react'
import { Wallet, Zap, Activity, TrendingUp } from 'lucide-react'
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
import { getBalance, getUsage, getUsageSummary } from '../api/user'
import { getErrorMessage } from '../api/client'
import type { BalanceResponse, UsageLog, UsageSummary } from '../types'

export default function Dashboard() {
  const [balance, setBalance] = useState<BalanceResponse | null>(null)
  const [summary, setSummary] = useState<UsageSummary | null>(null)
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [balanceRes, summaryRes, usageRes] = await Promise.all([
          getBalance(),
          getUsageSummary().catch(() => null),
          getUsage({ page_size: 100 }),
        ])
        setBalance(balanceRes)
        setSummary(summaryRes)
        setUsageLogs(usageRes.items)
      } catch (err) {
        setError(getErrorMessage(err))
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Today's usage
  const todayStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    const todayLogs = usageLogs.filter((log) =>
      log.created_at.startsWith(today),
    )
    return {
      tokens: todayLogs.reduce((sum, log) => sum + log.total_tokens, 0),
      requests: todayLogs.length,
    }
  }, [usageLogs])

  // 7-day chart data
  const chartData = useMemo(() => {
    const days: { tokens: number; label: string }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const dayLogs = usageLogs.filter((log) =>
        log.created_at.startsWith(dateStr),
      )
      days.push({
        tokens: dayLogs.reduce((sum, log) => sum + log.total_tokens, 0),
        label: d.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }),
      })
    }
    return days
  }, [usageLogs])

  const recentLogs = usageLogs.slice(0, 10)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your account activity
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Current Balance"
          value={balance ? `${balance.balance.toLocaleString()}` : '--'}
          icon={Wallet}
          subtitle={
            balance
              ? `Frozen: ${balance.frozen.toLocaleString()} tokens`
              : undefined
          }
          loading={loading && !balance}
        />
        <StatCard
          label="Today's Usage"
          value={todayStats.tokens.toLocaleString()}
          icon={Zap}
          subtitle="tokens used today"
          loading={loading}
          iconColor="text-amber-600"
        />
        <StatCard
          label="Total Requests"
          value={
            summary
              ? summary.total_requests.toLocaleString()
              : usageLogs.length.toLocaleString()
          }
          icon={Activity}
          subtitle="all-time API calls"
          loading={loading}
          iconColor="text-emerald-600"
        />
      </div>

      {/* Chart */}
      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Last 7 Days Usage
            </h2>
            <p className="text-sm text-gray-500">Daily token consumption</p>
          </div>
          <TrendingUp className="h-5 w-5 text-gray-400" />
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                }}
                formatter={(value: number) => [value.toLocaleString(), 'Tokens']}
              />
              <Bar dataKey="tokens" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent usage */}
      <div className="card overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent API Calls
          </h2>
          <p className="text-sm text-gray-500">Last 10 requests</p>
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
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentLogs.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-8 text-center text-sm text-gray-500"
                  >
                    {loading ? 'Loading...' : 'No usage data yet'}
                  </td>
                </tr>
              ) : (
                recentLogs.map((log) => (
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
      </div>
    </div>
  )
}
