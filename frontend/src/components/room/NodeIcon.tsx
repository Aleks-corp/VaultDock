import type { VaultNode } from '@/lib/types'
import { getNodeVisual } from '@/lib/folderColors'
import { cn } from '@/lib/utils'

export function NodeIcon({
  node,
  className,
}: {
  node: Pick<VaultNode, 'kind'> & { color?: string }
  className?: string
}) {
  const visual = getNodeVisual(node)
  return (
    <img
      src={visual.icon}
      alt=""
      draggable={false}
      className={cn('shrink-0 object-contain select-none', className)}
    />
  )
}
