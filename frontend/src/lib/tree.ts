import type { FileNode, FolderNode, VaultNode } from './types'

export function isFile(node: VaultNode): node is FileNode {
  return node.kind === 'file'
}

export function isFolder(node: VaultNode): node is FolderNode {
  return node.kind === 'folder'
}

export function isActive(node: VaultNode): boolean {
  return node.deletedAt === null
}

export function getChildren(
  nodes: VaultNode[],
  parentId: string,
  { includeDeleted = false }: { includeDeleted?: boolean } = {},
): VaultNode[] {
  return nodes.filter((n) => n.parentId === parentId && (includeDeleted || isActive(n)))
}

/** Direct children ids only, active or not — used for cascade operations. */
export function getDirectChildIds(nodes: VaultNode[], parentId: string): string[] {
  return nodes.filter((n) => n.parentId === parentId).map((n) => n.id)
}

/** Returns the ids of a node and all of its nested descendants (active or not). */
export function getSubtreeIds(nodes: VaultNode[], rootId: string): string[] {
  const byParent = new Map<string, string[]>()
  for (const n of nodes) {
    if (n.parentId === null) continue
    const list = byParent.get(n.parentId)
    if (list) list.push(n.id)
    else byParent.set(n.parentId, [n.id])
  }

  const result: string[] = [rootId]
  const stack = [rootId]
  while (stack.length > 0) {
    const current = stack.pop()!
    const children = byParent.get(current)
    if (!children) continue
    for (const childId of children) {
      result.push(childId)
      stack.push(childId)
    }
  }
  return result
}

/** Ids of all ancestor folders of a node, from its parent up to (and including) the root. */
export function getAncestorIds(nodes: VaultNode[], nodeId: string): string[] {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const ancestors: string[] = []
  let current = byId.get(nodeId)
  while (current && current.parentId !== null) {
    ancestors.push(current.parentId)
    current = byId.get(current.parentId)
  }
  return ancestors
}

/** Breadcrumb path from the "My Files" root to (and including) the given folder. */
export function getPath(nodes: VaultNode[], folderId: string): FolderNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const path: FolderNode[] = []
  let current = byId.get(folderId)
  while (current && current.kind === 'folder') {
    path.unshift(current)
    if (current.parentId === null) break
    current = byId.get(current.parentId)
  }
  return path
}

export function countContents(
  nodes: VaultNode[],
  folderId: string,
): { folders: number; files: number } {
  let folders = 0
  let files = 0
  for (const id of getSubtreeIds(nodes, folderId)) {
    if (id === folderId) continue
    const node = nodes.find((n) => n.id === id)
    if (!node || !isActive(node)) continue
    if (node.kind === 'folder') folders++
    else files++
  }
  return { folders, files }
}

export function totalStorageBytes(nodes: VaultNode[]): number {
  return nodes
    .filter((n) => n.kind === 'file')
    .reduce((sum, n) => sum + (n as FileNode).size, 0)
}

export function searchNodes(nodes: VaultNode[], query: string): VaultNode[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return nodes.filter((n) => isActive(n) && n.name.toLowerCase().includes(q))
}

/** Human-readable "My Files / Folder / Subfolder" location for a node, excluding the node itself. */
export function getNodeLocationLabel(nodes: VaultNode[], node: VaultNode): string {
  const rootLabel = 'My Files'
  if (node.parentId === null) return rootLabel
  const parentPath = getPath(nodes, node.parentId)
  const folderNames = parentPath.filter((f) => !f.isRoot).map((f) => f.name)
  return [rootLabel, ...folderNames].join(' / ')
}
