import type { StatusType } from '../../types'

interface Props {
  status: StatusType
  rate?: number
  size?: 'sm' | 'md'
}

const config = {
  green: { dot: 'bg-status-green', cls: 'badge-green', label: '정상' },
  yellow: { dot: 'bg-status-yellow', cls: 'badge-yellow', label: '주의' },
  red: { dot: 'bg-status-red', cls: 'badge-red', label: '위험' },
}

export default function StatusBadge({ status, rate, size = 'md' }: Props) {
  const { dot, cls, label } = config[status]
  return (
    <span className={cls + (size === 'sm' ? ' text-[11px] px-2 py-0.5' : '')}>
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${dot}`} />
      {rate !== undefined ? `${rate.toFixed(1)}%` : label}
    </span>
  )
}

export function StatusDot({ status, size = 16 }: { status: StatusType; size?: number }) {
  const colors = { green: '#00C896', yellow: '#FFB800', red: '#FF4B4B' }
  return (
    <span
      className="inline-block rounded-full flex-shrink-0"
      style={{ width: size, height: size, backgroundColor: colors[status] }}
    />
  )
}
