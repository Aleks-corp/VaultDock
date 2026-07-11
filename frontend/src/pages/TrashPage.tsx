import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { MoreHorizontal, RotateCcw, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog'
import { NodeIcon } from '@/components/room/NodeIcon'
import { useVaultStore } from '@/lib/store'
import { countContents, getNodeLocationLabel, isFile } from '@/lib/tree'
import { formatBytes, formatRelative } from '@/lib/format'
import type { VaultNode } from '@/lib/types'

export function TrashPage() {
  const nodes = useVaultStore((s) => s.nodes)
  const restoreNodes = useVaultStore((s) => s.restoreNodes)
  const deleteNodesForever = useVaultStore((s) => s.deleteNodesForever)
  const emptyTrash = useVaultStore((s) => s.emptyTrash)

  const [deleteTarget, setDeleteTarget] = useState<VaultNode | null>(null)
  const [emptyConfirmOpen, setEmptyConfirmOpen] = useState(false)

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])

  const trashedRoots = useMemo(() => {
    return nodes
      .filter((n) => {
        if (n.deletedAt === null) return false
        const parent = n.parentId ? byId.get(n.parentId) : null
        return !parent || parent.deletedAt === null
      })
      .sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0))
  }, [nodes, byId])

  const allTrashedCount = useMemo(() => nodes.filter((n) => n.deletedAt !== null).length, [nodes])

  const deleteCounts = deleteTarget && deleteTarget.kind === 'folder' ? countContents(nodes, deleteTarget.id) : null

  async function handleRestore(node: VaultNode) {
    await restoreNodes([node.id])
    toast.success(`"${node.name}" restored`)
  }

  async function handleDeleteForever(node: VaultNode) {
    await deleteNodesForever([node.id])
    toast.success(`"${node.name}" deleted permanently`)
  }

  async function handleEmptyTrash() {
    await emptyTrash()
    toast.success('Trash emptied')
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Trash</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Items are kept here until restored or permanently deleted.
          </p>
        </div>
        {trashedRoots.length > 0 && (
          <Button variant="outline" onClick={() => setEmptyConfirmOpen(true)}>
            <Trash2 className="size-4" />
            Empty Trash
          </Button>
        )}
      </div>

      {trashedRoots.length === 0 ? (
        <div className="mt-16 flex flex-col items-center justify-center gap-3 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Trash2 className="size-6" strokeWidth={1.75} />
          </span>
          <div>
            <p className="font-medium text-foreground">Trash is empty</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Deleted files and folders will appear here before they're gone for good.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-64">Location</TableHead>
                <TableHead className="w-40">Deleted</TableHead>
                <TableHead className="w-28">Size</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {trashedRoots.map((node) => (
                <TableRow key={node.id}>
                  <TableCell>
                    <span className="flex items-center gap-2.5">
                      <NodeIcon node={node} className="size-7 shrink-0" />
                      <span className="truncate font-medium text-foreground">{node.name}</span>
                    </span>
                  </TableCell>
                  <TableCell className="truncate text-muted-foreground">
                    {getNodeLocationLabel(nodes, node)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {node.deletedAt ? formatRelative(node.deletedAt) : '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {isFile(node) ? formatBytes(node.size) : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => handleRestore(node)} title="Restore">
                        <RotateCcw className="size-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => handleRestore(node)}>
                            <RotateCcw className="size-4" /> Restore
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteTarget(node)}>
                            <Trash2 className="size-4" /> Delete forever
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(o) => !o && setDeleteTarget(null)}
          title={`Delete "${deleteTarget.name}" forever?`}
          description={
            deleteTarget.kind === 'folder' ? (
              <>
                This permanently deletes the folder
                {deleteCounts && deleteCounts.folders + deleteCounts.files > 0 && (
                  <>
                    {' '}
                    along with{' '}
                    <strong>
                      {deleteCounts.folders} folder{deleteCounts.folders === 1 ? '' : 's'} and {deleteCounts.files}{' '}
                      file{deleteCounts.files === 1 ? '' : 's'}
                    </strong>{' '}
                    inside it
                  </>
                )}
                . This cannot be undone.
              </>
            ) : (
              'This permanently deletes the file. This cannot be undone.'
            )
          }
          confirmLabel="Delete forever"
          destructive
          onConfirm={() => handleDeleteForever(deleteTarget)}
        />
      )}

      <ConfirmDialog
        open={emptyConfirmOpen}
        onOpenChange={setEmptyConfirmOpen}
        title="Empty trash?"
        description={`This permanently deletes all ${allTrashedCount} item${allTrashedCount === 1 ? '' : 's'} in Trash. This cannot be undone.`}
        confirmLabel="Empty Trash"
        destructive
        onConfirm={handleEmptyTrash}
      />
    </div>
  )
}
