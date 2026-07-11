import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { AlertTriangle, ShieldCheck } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog'
import { DEMO_QUOTA_BYTES } from '@/components/layout/StorageUsageCard'
import { useVaultStore } from '@/lib/store'
import { totalStorageBytes } from '@/lib/tree'
import { formatBytes } from '@/lib/format'

export function SettingsPage() {
  const navigate = useNavigate()
  const nodes = useVaultStore((s) => s.nodes)
  const clearAllData = useVaultStore((s) => s.clearAllData)
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)

  const used = totalStorageBytes(nodes)
  const percent = Math.min(100, (used / DEMO_QUOTA_BYTES) * 100)
  const fileCount = nodes.filter((n) => n.kind === 'file' && n.deletedAt === null).length
  const hasContent = nodes.some((n) => !(n.kind === 'folder' && n.isRoot))

  async function handleClearAllData() {
    await clearAllData()
    toast.success('All data cleared')
    navigate('/')
  }

  return (
    <div className="max-w-2xl p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage storage and data for this browser.</p>
      </div>

      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Storage</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatBytes(used)} of {formatBytes(DEMO_QUOTA_BYTES)} used · {fileCount} file{fileCount === 1 ? '' : 's'}
        </p>
        <Progress value={percent} className="mt-3 h-1.5" />
      </section>

      <section className="mt-4 rounded-xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <ShieldCheck className="size-4 text-primary" /> Data &amp; privacy
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          VaultDock runs entirely in your browser. Your files, folders, and activity history are stored locally
          via IndexedDB — nothing is uploaded to a server, and clearing your browser storage removes it
          permanently.
        </p>
      </section>

      <section className="mt-4 rounded-xl border border-destructive/30 bg-card p-5">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-destructive">
          <AlertTriangle className="size-4" /> Danger zone
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Permanently delete every folder and file stored in this browser. This cannot be undone.
        </p>
        <Button
          variant="destructive"
          className="mt-3"
          onClick={() => setClearConfirmOpen(true)}
          disabled={!hasContent}
        >
          Clear all data
        </Button>
      </section>

      <ConfirmDialog
        open={clearConfirmOpen}
        onOpenChange={setClearConfirmOpen}
        title="Clear all data?"
        description="This permanently deletes every folder and file stored in this browser. This cannot be undone."
        confirmLabel="Clear everything"
        destructive
        onConfirm={handleClearAllData}
      />
    </div>
  )
}
