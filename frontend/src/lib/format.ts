import { format, formatDistanceToNow } from 'date-fns'

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 KB'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** exponent
  const decimals = exponent === 0 ? 0 : value < 10 ? 1 : 0
  return `${value.toFixed(decimals)} ${units[exponent]}`
}

export function formatDate(timestamp: number): string {
  return format(timestamp, 'MMM d, yyyy h:mm a')
}

export function formatShortDate(timestamp: number): string {
  return format(timestamp, 'MMM d, yyyy')
}

export function formatRelative(timestamp: number): string {
  return formatDistanceToNow(timestamp, { addSuffix: true })
}
