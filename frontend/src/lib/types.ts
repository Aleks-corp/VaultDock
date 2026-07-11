export type NodeKind = 'folder' | 'file'

interface BaseNode {
  id: string
  /** null only for the "My Files" root folder */
  parentId: string | null
  name: string
  createdAt: number
  updatedAt: number
  /** soft-delete timestamp; null when active */
  deletedAt: number | null
}

export interface FolderNode extends BaseNode {
  kind: 'folder'
  /** True only for the single auto-created "My Files" root folder. */
  isRoot: boolean
  /** Cosmetic color tag, one of FOLDER_COLORS ids in lib/folderColors.ts. Optional for older records. */
  color?: string
}

export interface FileNode extends BaseNode {
  kind: 'file'
  mimeType: string
  size: number
}

export type VaultNode = FolderNode | FileNode

export type ActivityAction =
  | 'folder_created'
  | 'file_uploaded'
  | 'renamed'
  | 'moved_to_trash'
  | 'restored'
  | 'deleted_forever'

export interface ActivityEntry {
  id: string
  nodeId: string
  nodeName: string
  nodeKind: NodeKind
  action: ActivityAction
  detail?: string
  timestamp: number
}

export type SortField = 'name' | 'updatedAt' | 'size'
export type SortDirection = 'asc' | 'desc'
export type ViewMode = 'list' | 'grid'
export type KindFilter = 'all' | 'folder' | 'file'
