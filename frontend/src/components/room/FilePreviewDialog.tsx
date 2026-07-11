import { useEffect, useState } from 'react'
import { Download, Info } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { NodeDetailsDialog } from './NodeDetailsDialog'
import { useVaultStore } from '@/lib/store'
import { getFileObjectUrl, downloadFile } from '@/lib/blob'
import { formatBytes, formatDate } from '@/lib/format'
import type { FileNode } from '@/lib/types'

export function FilePreviewDialog({
  node,
  open,
  onOpenChange,
}: {
  node: FileNode | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const nodes = useVaultStore((s) => s.nodes)
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    if (!open || !node) {
      setUrl(null)
      return
    }
    let objectUrl: string | null = null
    let cancelled = false
    setError(false)
    getFileObjectUrl(node.id).then((result) => {
      if (cancelled) return
      if (!result) {
        setError(true)
        return
      }
      objectUrl = result
      setUrl(result)
    })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [open, node])

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex h-[85vh] w-full max-w-4xl flex-col sm:max-w-4xl">
          <DialogHeader className="flex-row items-center justify-between gap-4 pr-8">
            <div className="min-w-0">
              <DialogTitle className="truncate">{node?.name}</DialogTitle>
              {node && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatBytes(node.size)} · Modified {formatDate(node.updatedAt)}
                </p>
              )}
            </div>
            {node && (
              <div className="flex shrink-0 items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowDetails(true)}>
                  <Info className="size-4" />
                  Details
                </Button>
                <Button variant="outline" size="sm" onClick={() => downloadFile(node)}>
                  <Download className="size-4" />
                  Download
                </Button>
              </div>
            )}
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-muted">
            {error ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Couldn't load this file.
              </div>
            ) : url ? (
              <iframe src={url} title={node?.name ?? 'File preview'} className="h-full w-full" />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading…</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <NodeDetailsDialog
        node={node}
        allNodes={nodes}
        open={showDetails}
        onOpenChange={setShowDetails}
      />
    </>
  )
}
