import { useState } from 'react'
import { Download, Eye, FolderOpen, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { RenameDialog } from '@/components/dialogs/RenameDialog'
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog'
import { NodeIcon } from './NodeIcon'
import { useVaultStore } from '@/lib/store'
import { countContents, isFile } from '@/lib/tree'
import { downloadFile } from '@/lib/blob'
import { formatBytes, formatRelative } from '@/lib/format'
import type { VaultNode } from '@/lib/types'

interface NodeTableProps {
  nodes: VaultNode[]
  allNodes: VaultNode[]
  selectedIds: Set<string>
  onToggle: (id: string, checked: boolean) => void
  onToggleAll: (checked: boolean) => void
  onOpen: (node: VaultNode) => void
}

export function NodeTable({ nodes, allNodes, selectedIds, onToggle, onToggleAll, onOpen }: NodeTableProps) {
  const renameNode = useVaultStore((s) => s.renameNode)
  const softDeleteNodes = useVaultStore((s) => s.softDeleteNodes)
  const restoreNodes = useVaultStore((s) => s.restoreNodes)
  const [renameTarget, setRenameTarget] = useState<VaultNode | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<VaultNode | null>(null)

  const allChecked = nodes.length > 0 && nodes.every((n) => selectedIds.has(n.id))
  const deleteCounts = deleteTarget && deleteTarget.kind === 'folder' ? countContents(allNodes, deleteTarget.id) : null

  async function handleDelete(node: VaultNode) {
    await softDeleteNodes([node.id])
    toast.success(`"${node.name}" moved to trash`, {
      action: { label: 'Undo', onClick: () => restoreNodes([node.id]) },
    })
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={allChecked}
                onCheckedChange={(c) => onToggleAll(c === true)}
                aria-label="Select all"
              />
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="w-24">Type</TableHead>
            <TableHead className="w-40">Modified</TableHead>
            <TableHead className="w-28">Size</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {nodes.map((node) => (
            <TableRow
              key={node.id}
              data-state={selectedIds.has(node.id) ? 'selected' : undefined}
              className="cursor-pointer"
              onClick={() => onOpen(node)}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedIds.has(node.id)}
                  onCheckedChange={(c) => onToggle(node.id, c === true)}
                  aria-label={`Select ${node.name}`}
                />
              </TableCell>
              <TableCell>
                <span className="flex items-center gap-2.5">
                  <NodeIcon node={node} className="size-7" />
                  <span className="truncate font-medium text-foreground">{node.name}</span>
                </span>
              </TableCell>
              <TableCell className="text-muted-foreground">{node.kind === 'folder' ? 'Folder' : 'PDF'}</TableCell>
              <TableCell className="text-muted-foreground">{formatRelative(node.updatedAt)}</TableCell>
              <TableCell className="text-muted-foreground">{isFile(node) ? formatBytes(node.size) : '—'}</TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => onOpen(node)}>
                      {node.kind === 'folder' ? (
                        <FolderOpen className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                      Open
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setRenameTarget(node)}>
                      <Pencil className="size-4" /> Rename
                    </DropdownMenuItem>
                    {isFile(node) && (
                      <DropdownMenuItem onSelect={() => downloadFile(node)}>
                        <Download className="size-4" /> Download
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => setDeleteTarget(node)}>
                      <Trash2 className="size-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {renameTarget && (
        <RenameDialog
          open={!!renameTarget}
          onOpenChange={(o) => !o && setRenameTarget(null)}
          title={renameTarget.kind === 'folder' ? 'Rename folder' : 'Rename file'}
          label={renameTarget.kind === 'folder' ? 'Folder name' : 'File name'}
          initialName={renameTarget.name}
          onSubmit={(name) => renameNode(renameTarget.id, name)}
        />
      )}
      {deleteTarget && (
        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(o) => !o && setDeleteTarget(null)}
          title={`Delete "${deleteTarget.name}"?`}
          description={
            deleteTarget.kind === 'folder' ? (
              <>
                This moves the folder to Trash
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
                . You can restore it from Trash later.
              </>
            ) : (
              'This moves the file to Trash. You can restore it later.'
            )
          }
          confirmLabel="Move to trash"
          destructive
          onConfirm={() => handleDelete(deleteTarget)}
        />
      )}
    </>
  )
}
