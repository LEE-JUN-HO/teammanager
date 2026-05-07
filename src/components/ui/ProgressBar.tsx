import type { StatusType } from '../../types'

interface Props {
  rate: number
  status: StatusType
  showLabel?: boolean
  height?: number
}

const barColors = {
  green: 'bg-status-green',
  yellow: 'bg-status-yellow',
  red: 'bg-status-red',
}

export default function ProgressBar({ rate, status, showLabel = false, height = 8 }: Props) {
  const clipped = Math.min(rate, 120)
  const width = Math.min((clipped / 120) * 100, 100)

  return (
    <div className="flex items-center gap-3">
      <div
        className="flex-1 bg-toss-gray-100 rounded-full overflow-hidden"
        style={{ height }}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColors[status]}`}
          style={{ width: `${width}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-sm font-semibold text-toss-gray-700 w-14 text-right">
          {rate.toFixed(1)}%
        </span>
      )}
    </div>
  )
}
