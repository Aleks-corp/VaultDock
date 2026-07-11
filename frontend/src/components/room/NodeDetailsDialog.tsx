import { useEffect, useState } from 'react'
import {
  FilePlus,
  FileUp,
  FolderPlus,
  History,
  PencilLine,
  RotateCcw,
  Trash2,
  XCircle,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { NodeIcon } from './NodeIcon'
import { getActivityForNode } from '@/lib/db'
import { countContents, getNodeLocationLabel, isFile } from '@/lib/tree'
import { formatBytes, formatDate, formatRelative } from '@/lib/format'
import type { ActivityAction, ActivityEntry, VaultNode } from '@/lib/types'

const ACTION_LABEL: Record<ActivityAction, string> = {
  folder_created: 'Folder created',
  file_uploaded: 'File uploaded',
  renamed: 'Renamed',
  moved_to_trash: 'Moved to trash',
  restored: 'Restored',
  deleted_forever: 'Deleted forever',
}

const ACTION_ICON: Record<ActivityAction, typeof FilePlus> = {
  folder_created: FolderPlus,
  file_uploaded: FileUp,
  renamed: PencilLine,
  moved_to_trash: Trash2,
  restored: RotateCcw,
  deleted_forever: XCircle,
}

/**
 * Modal fallback for details, used where there's no persistent side panel available
 * (e.g. the Recent page's tables, or from inside the file preview dialog).
 * Within the My Files browser itself, DetailsPanel.tsx is used instead.
 */
export function NodeDetailsDialog({
  node,
  allNodes,
  open,
  onOpenChange,
}: {
  node: VaultNode | null
  allNodes: VaultNode[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [activity, setActivity] = useState<ActivityEntry[]>([])

  useEffect(() => {
    if (!open || !node) {
      setActivity([])
      return
    }
    let cancelled = false
    getActivityForNode(node.id).then((entries) => {
      if (!cancelled) setActivity(entries)
    })
    return () => {
      cancelled = true
    }
  }, [open, node])

  if (!node) return null

  const counts = node.kind === 'folder' ? countContents(allNodes, node.id) : null
  const location = getNodeLocationLabel(allNodes, node)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-full max-w-md flex-col sm:max-w-md">
        <DialogHeader className="flex-row items-center gap-3 pr-6">
          <NodeIcon node={node} className="size-11 shrink-0" />
          <DialogTitle className="truncate text-left">{node.name}</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
            <dt className="text-muted-foreground">Type</dt>
            <dd className="text-foreground">{node.kind === 'folder' ? 'Folder' : 'PDF file'}</dd>

            {isFile(node) && (
              <>
                <dt className="text-muted-foreground">Size</dt>
                <dd className="text-foreground">{formatBytes(node.size)}</dd>
              </>
            )}

            {counts && (
              <>
                <dt className="text-muted-foreground">Contains</dt>
                <dd className="text-foreground">
                  {counts.folders} folder{counts.folders === 1 ? '' : 's'}, {counts.files} file
                  {counts.files === 1 ? '' : 's'}
                </dd>
              </>
            )}

            <dt className="text-muted-foreground">Location</dt>
            <dd className="truncate text-foreground" title={location}>
              {location}
            </dd>

            <dt className="text-muted-foreground">Modified</dt>
            <dd className="text-foreground">{formatDate(node.updatedAt)}</dd>

            <dt className="text-muted-foreground">Created</dt>
            <dd className="text-foreground">{formatDate(node.createdAt)}</dd>
          </dl>

          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <History className="size-3.5" /> Activity
            </p>
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity recorded.</p>
            ) : (
              <ScrollArea className="max-h-56">
                <ul className="space-y-3 pr-3">
                  {activity.map((entry) => {
                    const Icon = ACTION_ICON[entry.action]
                    return (
                      <li key={entry.id} className="flex items-start gap-2.5 text-sm">
                        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <Icon className="size-3.5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-foreground">{ACTION_LABEL[entry.action]}</span>
                          {entry.detail && (
                            <span className="block text-xs text-muted-foreground">{entry.detail}</span>
                          )}
                          <span className="block text-xs text-muted-foreground">
                            {formatRelative(entry.timestamp)}
                          </span>
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
