import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  Landmark,
  ArrowDownCircle,
  Send,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Percent,
} from 'lucide-react'
import { getBalance as getUserBalance } from '../api/user'
import { deposit, transfer, getStatement, getInterestRate } from '../api/bank'
import { getErrorMessage } from '../api/client'
import type {
  BalanceResponse,
  BankBalanceResponse,
  InterestRateResponse,
  Transaction,
  TransactionType,
} from '../types'

const PAGE_SIZE = 10

const typeColors: Record<TransactionType, string> = {
  deposit: 'bg-green-100 text-green-700',
  withdraw: 'bg-amber-100 text-amber-700',
  borrow: 'bg-red-100 text-red-700',
  repay: 'bg-blue-100 text-blue-700',
  transfer_in: 'bg-cyan-100 text-cyan-700',
  transfer_out: 'bg-orange-100 text-orange-700',
  interest: 'bg-purple-100 text-purple-700',
}

interface FormMsg {
  ok: boolean
  text: string
}

export default function Bank() {
  const [balance, setBalance] = useState<BalanceResponse | null>(null)
  const [bankInfo, setBankInfo] = useState<BankBalanceResponse | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [interestRate, setInterestRate] = useState<InterestRateResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [depositAmount, setDepositAmount] = useState('')
  const [depositLoading, setDepositLoading] = useState(false)
  const [depositMsg, setDepositMsg] = useState<FormMsg | null>(null)

  const [transferEmail, setTransferEmail] = useState('')
  const [transferAmount, setTransferAmount] = useState('')
  const [transferDesc, setTransferDesc] = useState('')
  const [transferLoading, setTransferLoading] = useState(false)
  const [transferMsg, setTransferMsg] = useState<FormMsg | null>(null)

  const fetchTransactions = useCallback(async (pageNum: number) => {
    try {
      const res = await getStatement({ page: pageNum, page_size: PAGE_SIZE })
      setTransactions(res.items)
      setTotal(res.total)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }, [])

  const refreshBalance = useCallback(async () => {
    try {
      const [bal, bank] = await Promise.all([getUserBalance(), getInterestRate().catch(() => null)])
      setBalance(bal)
      if (bank) setInterestRate(bank)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await Promise.all([
        refreshBalance(),
        fetchTransactions(1),
      ])
      setLoading(false)
    }
    init()
  }, [refreshBalance, fetchTransactions])

  const handleDeposit = async (e: FormEvent) => {
    e.preventDefault()
    setDepositLoading(true)
    setDepositMsg(null)
    try {
      await deposit({ amount: parseFloat(depositAmount) })
      setDepositMsg({ ok: true, text: 'Deposit successful!' })
      setDepositAmount('')
      await Promise.all([refreshBalance(), fetchTransactions(page)])
    } catch (err) {
      setDepositMsg({ ok: false, text: getErrorMessage(err) })
    } finally {
      setDepositLoading(false)
    }
  }

  const handleTransfer = async (e: FormEvent) => {
    e.preventDefault()
    setTransferLoading(true)
    setTransferMsg(null)
    try {
      await transfer({
        to_email: transferEmail,
        amount: parseFloat(transferAmount),
        description: transferDesc || undefined,
      })
      setTransferMsg({ ok: true, text: 'Transfer successful!' })
      setTransferEmail('')
      setTransferAmount('')
      setTransferDesc('')
      await Promise.all([refreshBalance(), fetchTransactions(page)])
    } catch (err) {
      setTransferMsg({ ok: false, text: getErrorMessage(err) })
    } finally {
      setTransferLoading(false)
    }
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    fetchTransactions(newPage)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Token Bank</h1>
        <p className="mt-1 text-sm text-gray-500">
          Deposit, transfer, and track your token balance
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Balance + Interest */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="card p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-50">
              <Landmark className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Current Balance</p>
              <p className="text-2xl font-bold text-gray-900">
                {balance ? balance.balance.toLocaleString() : '--'}
              </p>
              <p className="text-xs text-gray-400">tokens</p>
            </div>
          </div>
          {balance && (
            <div className="mt-4 flex gap-6 border-t border-gray-100 pt-4 text-sm">
              <div>
                <span className="text-gray-500">Frozen: </span>
                <span className="font-medium text-gray-900">
                  {balance.frozen.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Available: </span>
                <span className="font-medium text-gray-900">
                  {balance.available.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Credit: </span>
                <span className="font-medium text-gray-900">
                  {balance.credit_limit.toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-50">
              <Percent className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Interest Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {interestRate
                  ? `${(interestRate.interest_rate * 100).toFixed(3)}%`
                  : '--'}
              </p>
              <p className="text-xs text-gray-400">daily (positive balance)</p>
            </div>
          </div>
          {interestRate && (
            <p className="mt-4 text-sm text-gray-500">
              Debt rate: {(interestRate.debt_interest_rate * 100).toFixed(3)}%/day.
              {' '}Earn interest on idle tokens, pay interest on debt. Settled daily.
            </p>
          )}
        </div>
      </div>

      {/* Forms */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Deposit */}
        <div className="card p-6">
          <div className="mb-4 flex items-center gap-2">
            <ArrowDownCircle className="h-5 w-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">Deposit</h2>
          </div>
          <form onSubmit={handleDeposit} className="space-y-4">
            <div>
              <label className="label-text" htmlFor="deposit-amount">
                Amount (tokens)
              </label>
              <input
                id="deposit-amount"
                type="number"
                step="1"
                min="1"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="10000"
                required
                className="input-field"
              />
            </div>
            {depositMsg && (
              <div
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                  depositMsg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}
              >
                {depositMsg.ok ? (
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                )}
                {depositMsg.text}
              </div>
            )}
            <button type="submit" disabled={depositLoading} className="btn-primary w-full">
              {depositLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Deposit Tokens'
              )}
            </button>
          </form>
        </div>

        {/* Transfer */}
        <div className="card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Send className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Transfer</h2>
          </div>
          <form onSubmit={handleTransfer} className="space-y-4">
            <div>
              <label className="label-text" htmlFor="transfer-email">
                Recipient Email
              </label>
              <input
                id="transfer-email"
                type="email"
                value={transferEmail}
                onChange={(e) => setTransferEmail(e.target.value)}
                placeholder="recipient@example.com"
                required
                className="input-field"
              />
            </div>
            <div>
              <label className="label-text" htmlFor="transfer-amount">
                Amount (tokens)
              </label>
              <input
                id="transfer-amount"
                type="number"
                step="1"
                min="1"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="5000"
                required
                className="input-field"
              />
            </div>
            <div>
              <label className="label-text" htmlFor="transfer-desc">
                Description (optional)
              </label>
              <input
                id="transfer-desc"
                type="text"
                value={transferDesc}
                onChange={(e) => setTransferDesc(e.target.value)}
                placeholder="Payment for API usage"
                className="input-field"
              />
            </div>
            {transferMsg && (
              <div
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                  transferMsg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}
              >
                {transferMsg.ok ? (
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                )}
                {transferMsg.text}
              </div>
            )}
            <button type="submit" disabled={transferLoading} className="btn-primary w-full">
              {transferLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Send Tokens'
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Transaction history */}
      <div className="card overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Transaction History</h2>
          <p className="text-sm text-gray-500">{total} total transactions</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Type</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Description</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Balance After</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">Loading...</td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">No transactions yet</td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          typeColors[tx.type] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {tx.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td
                      className={`px-6 py-3 text-right text-sm font-medium ${
                        tx.amount >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {tx.amount >= 0 ? '+' : ''}
                      {tx.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500">
                      {tx.description || '--'}
                    </td>
                    <td className="px-6 py-3 text-right text-sm text-gray-900">
                      {tx.balance_after.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-sm text-gray-500">
                      {new Date(tx.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3">
            <button onClick={() => handlePageChange(page - 1)} disabled={page <= 1} className="btn-secondary">
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>
            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
            <button onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages} className="btn-secondary">
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
