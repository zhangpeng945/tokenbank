import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  iconColor?: string
  subtitle?: string
  loading?: boolean
}

export default function StatCard({
  label,
  value,
  icon: Icon,
  iconColor = 'text-indigo-600',
  subtitle,
  loading,
}: StatCardProps) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-500">{label}</p>
          {loading ? (
            <div className="mt-2 h-8 w-24 animate-pulse rounded bg-gray-200" />
          ) : (
            <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          )}
          {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
        </div>
        {Icon && (
          <div className="ml-4 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gray-50">
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </div>
        )}
      </div>
    </div>
  )
}
