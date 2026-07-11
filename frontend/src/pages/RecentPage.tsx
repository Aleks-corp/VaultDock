import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, Download, Eye, Info, MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { NodeIcon } from '@/components/room/NodeIcon'
import { NodeDetailsDialog } from '@/components/room/NodeDetailsDialog'
import { useVaultStore } from '@/lib/store'
import { getNodeLocationLabel, isActive, isFile, isFolder } from '@/lib/tree'
import { downloadFile } from '@/lib/blob'
import { formatBytes, formatRelative } from '@/lib/format'
import type { FileNode, FolderNode, VaultNode } from '@/lib/types'

const MAX_FOLDERS = 8
const MAX_FILES = 100

export function RecentPage() {
  const navigate = useNavigate()
  const nodes = useVaultStore((s) => s.nodes)
  const [detailsTarget, setDetailsTarget] = useState<VaultNode | null>(null)

  const recentFolders = useMemo<FolderNode[]>(() => {
    return nodes
      .filter(isFolder)
      .filter((n) => isActive(n) && !n.isRoot)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_FOLDERS)
  }, [nodes])

  const recentFiles = useMemo<FileNode[]>(() => {
    return nodes
      .filter(isFile)
      .filter(isActive)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_FILES)
  }, [nodes])

  const isEmpty = recentFolders.length === 0 && recentFiles.length === 0

  function openNode(node: VaultNode) {
    if (node.kind === 'folder') {
      navigate(`/folder/${node.id}`)
    } else if (node.parentId) {
      navigate(`/folder/${node.parentId}?select=${node.id}`)
    }
  }

  return (
    <div className="p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Recent</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Folders and files you've recently created or modified.
        </p>
      </div>

      {isEmpty ? (
        <div className="mt-16 flex flex-col items-center justify-center gap-3 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Clock className="size-6" strokeWidth={1.75} />
          </span>
          <div>
            <p className="font-medium text-foreground">Nothing recent yet</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Files and folders you create or edit will show up here.
            </p>
          </div>
        </div>
      ) : (
        <>
          {recentFolders.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold text-foreground">Folders</h2>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {recentFolders.map((node) => (
                  <button
                    key={node.id}
                    onClick={() => openNode(node)}
                    className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:shadow-sm"
                  >
                    <NodeIcon node={node} className="size-12 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">{node.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {formatRelative(node.updatedAt)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {recentFiles.length > 0 && (
            <div className="mt-8">
              <h2 className="text-sm font-semibold text-foreground">Files</h2>
              <div className="mt-3">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="w-64">Location</TableHead>
                      <TableHead className="w-40">Modified</TableHead>
                      <TableHead className="w-28">Size</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentFiles.map((node) => (
                      <TableRow key={node.id} className="cursor-pointer" onClick={() => openNode(node)}>
                        <TableCell>
                          <span className="flex items-center gap-2.5">
                            <NodeIcon node={node} className="size-7 shrink-0" />
                            <span className="truncate font-medium text-foreground">{node.name}</span>
                          </span>
                        </TableCell>
                        <TableCell className="truncate text-muted-foreground">
                          {getNodeLocationLabel(nodes, node)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatRelative(node.updatedAt)}</TableCell>
                        <TableCell className="text-muted-foreground">{formatBytes(node.size)}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => openNode(node)}>
                                <Eye className="size-4" /> Open
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => downloadFile(node)}>
                                <Download className="size-4" /> Download
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => setDetailsTarget(node)}>
                                <Info className="size-4" /> Details
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </>
      )}

      <NodeDetailsDialog
        node={detailsTarget}
        allNodes={nodes}
        open={!!detailsTarget}
        onOpenChange={(o) => !o && setDetailsTarget(null)}
      />
    </div>
  )
}
