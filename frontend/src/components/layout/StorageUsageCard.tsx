import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { useVaultStore } from '@/lib/store'
import { totalStorageBytes } from '@/lib/tree'
import { formatBytes } from '@/lib/format'

export const DEMO_QUOTA_BYTES = 5 * 1024 ** 3 // 5GB soft demo quota

export function StorageUsageCard() {
  const nodes = useVaultStore((s) => s.nodes)
  const used = totalStorageBytes(nodes)
  const percent = Math.min(100, (used / DEMO_QUOTA_BYTES) * 100)

  return (
    <Link
      to="/settings"
      className="block rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/40"
    >
      <p className="text-sm font-medium text-foreground">Storage Usage</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {formatBytes(used)} of {formatBytes(DEMO_QUOTA_BYTES)} used
      </p>
      <Progress value={percent} className="mt-2.5 h-1.5" />
      <span className="mt-2.5 flex items-center gap-0.5 text-xs font-medium text-muted-foreground">
        Manage storage
        <ChevronRight className="size-3.5" />
      </span>
    </Link>
  )
}
