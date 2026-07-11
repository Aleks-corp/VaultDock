import { create } from 'zustand'
import type { ActivityAction, FileNode, FolderNode, NodeKind, VaultNode } from './types'
import * as db from './db'
import { createId } from './id'
import { getAncestorIds, getSubtreeIds } from './tree'
import { getUniqueName, isNameTaken, validateName, validateUploadFile } from './validation'
import { DEFAULT_FOLDER_COLOR } from './folderColors'

interface RejectedUpload {
  name: string
  reason: string
}

interface VaultState {
  status: 'idle' | 'loading' | 'ready' | 'error'
  nodes: VaultNode[]
  /** Id of the single auto-created "My Files" root folder. Set once init() resolves. */
  rootFolderId: string | null
  init: () => Promise<void>

  createFolder: (parentId: string, name: string, color?: string) => Promise<FolderNode>
  uploadFiles: (
    parentId: string,
    files: File[],
  ) => Promise<{ created: FileNode[]; rejected: RejectedUpload[] }>
  renameNode: (id: string, name: string) => Promise<void>
  softDeleteNodes: (ids: string[]) => Promise<void>
  restoreNodes: (ids: string[]) => Promise<void>
  deleteNodesForever: (ids: string[]) => Promise<void>
  emptyTrash: () => Promise<void>
  clearAllData: () => Promise<void>
}

let initPromise: Promise<void> | null = null

async function logActivity(
  nodeId: string,
  nodeName: string,
  nodeKind: NodeKind,
  action: ActivityAction,
  detail?: string,
) {
  await db.putActivity({
    id: createId(),
    nodeId,
    nodeName,
    nodeKind,
    action,
    detail,
    timestamp: Date.now(),
  })
}

function createRootFolder(): FolderNode {
  const now = Date.now()
  return {
    id: createId(),
    parentId: null,
    kind: 'folder',
    name: 'My Files',
    isRoot: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }
}

export const useVaultStore = create<VaultState>((set, get) => ({
  status: 'idle',
  nodes: [],
  rootFolderId: null,

  init: async () => {
    if (initPromise) return initPromise
    initPromise = (async () => {
      set({ status: 'loading' })
      try {
        const { nodes } = await db.loadAll()
        let allNodes = nodes
        let root = allNodes.find((n): n is FolderNode => n.kind === 'folder' && n.isRoot)
        if (!root) {
          root = createRootFolder()
          await db.putNode(root)
          allNodes = [...allNodes, root]
        }
        set({ nodes: allNodes, rootFolderId: root.id, status: 'ready' })
      } catch (err) {
        console.error('Failed to load VaultDock data', err)
        set({ status: 'error' })
      }
    })()
    return initPromise
  },

  createFolder: async (parentId, rawName, color) => {
    const validation = validateName(rawName)
    if (!validation.ok) throw new Error(validation.error)
    const name = rawName.trim()
    const { nodes } = get()
    if (isNameTaken(nodes, parentId, name)) {
      throw new Error(`"${name}" already exists here.`)
    }

    const now = Date.now()
    const folder: FolderNode = {
      id: createId(),
      parentId,
      kind: 'folder',
      name,
      isRoot: false,
      color: color ?? DEFAULT_FOLDER_COLOR,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }

    await db.putNode(folder)
    await logActivity(folder.id, name, 'folder', 'folder_created')

    set((state) => ({ nodes: [...state.nodes, folder] }))
    return folder
  },

  uploadFiles: async (parentId, files) => {
    const now = Date.now()
    const created: FileNode[] = []
    const rejected: RejectedUpload[] = []
    const workingNodes = [...get().nodes]

    for (const file of files) {
      const validation = validateUploadFile(file)
      if (!validation.ok) {
        rejected.push({ name: file.name, reason: validation.error! })
        continue
      }

      const uniqueName = getUniqueName(workingNodes, parentId, file.name)
      const fileNode: FileNode = {
        id: createId(),
        parentId,
        kind: 'file',
        name: uniqueName,
        mimeType: file.type || 'application/pdf',
        size: file.size,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      }

      await db.putNode(fileNode)
      await db.putBlob(fileNode.id, file)
      await logActivity(
        fileNode.id,
        uniqueName,
        'file',
        'file_uploaded',
        uniqueName !== file.name ? `Renamed from "${file.name}" to avoid a duplicate` : undefined,
      )

      workingNodes.push(fileNode)
      created.push(fileNode)
    }

    if (created.length > 0) {
      set((state) => ({ nodes: [...state.nodes, ...created] }))
    }
    return { created, rejected }
  },

  renameNode: async (id, rawName) => {
    const validation = validateName(rawName)
    if (!validation.ok) throw new Error(validation.error)
    const name = rawName.trim()
    const { nodes } = get()
    const node = nodes.find((n) => n.id === id)
    if (!node) throw new Error('Item not found.')
    if (node.kind === 'folder' && node.isRoot) throw new Error('The My Files root cannot be renamed.')
    if (node.parentId && isNameTaken(nodes, node.parentId, name, id)) {
      throw new Error(`"${name}" already exists here.`)
    }

    const previousName = node.name
    const updated = { ...node, name, updatedAt: Date.now() } as VaultNode
    await db.putNode(updated)
    await logActivity(id, name, node.kind, 'renamed', `Renamed from "${previousName}"`)

    set((state) => ({ nodes: state.nodes.map((n) => (n.id === id ? updated : n)) }))
  },

  softDeleteNodes: async (ids) => {
    const { nodes } = get()
    const now = Date.now()
    const affectedIds = new Set<string>()
    for (const id of ids) {
      for (const descendantId of getSubtreeIds(nodes, id)) affectedIds.add(descendantId)
    }

    const affectedSet = affectedIds
    const updates = nodes
      .filter((n) => affectedSet.has(n.id))
      .map((n) => ({ ...n, deletedAt: now }) as VaultNode)

    await db.putNodes(updates)
    for (const id of ids) {
      const node = nodes.find((n) => n.id === id)
      if (node) await logActivity(node.id, node.name, node.kind, 'moved_to_trash')
    }

    const updateMap = new Map(updates.map((n) => [n.id, n]))
    set((state) => ({ nodes: state.nodes.map((n) => updateMap.get(n.id) ?? n) }))
  },

  restoreNodes: async (ids) => {
    const { nodes } = get()
    const now = Date.now()
    const affectedIds = new Set<string>()
    for (const id of ids) {
      for (const descendantId of getSubtreeIds(nodes, id)) affectedIds.add(descendantId)
      for (const ancestorId of getAncestorIds(nodes, id)) affectedIds.add(ancestorId)
    }

    const topLevel = new Set(ids)
    const updates = nodes
      .filter((n) => affectedIds.has(n.id))
      .map((n) => ({ ...n, deletedAt: null, updatedAt: topLevel.has(n.id) ? now : n.updatedAt }) as VaultNode)

    await db.putNodes(updates)
    for (const id of ids) {
      const node = nodes.find((n) => n.id === id)
      if (node) await logActivity(node.id, node.name, node.kind, 'restored')
    }

    const updateMap = new Map(updates.map((n) => [n.id, n]))
    set((state) => ({ nodes: state.nodes.map((n) => updateMap.get(n.id) ?? n) }))
  },

  deleteNodesForever: async (ids) => {
    const { nodes } = get()
    const affectedIds = new Set<string>()
    for (const id of ids) {
      for (const descendantId of getSubtreeIds(nodes, id)) affectedIds.add(descendantId)
    }
    const allIds = [...affectedIds]
    const fileIds = nodes.filter((n) => affectedIds.has(n.id) && n.kind === 'file').map((n) => n.id)

    await db.deleteBlobs(fileIds)
    await db.deleteNodeRecords(allIds)
    await db.deleteActivityForNodes(allIds)

    set((state) => ({ nodes: state.nodes.filter((n) => !affectedIds.has(n.id)) }))
  },

  emptyTrash: async () => {
    const { nodes } = get()
    const trashedIds = nodes.filter((n) => n.deletedAt !== null).map((n) => n.id)
    if (trashedIds.length === 0) return
    const trashedSet = new Set(trashedIds)
    const fileIds = nodes.filter((n) => trashedSet.has(n.id) && n.kind === 'file').map((n) => n.id)

    await db.deleteBlobs(fileIds)
    await db.deleteNodeRecords(trashedIds)
    await db.deleteActivityForNodes(trashedIds)

    set((state) => ({ nodes: state.nodes.filter((n) => !trashedSet.has(n.id)) }))
  },

  clearAllData: async () => {
    await db.clearAllData()
    const root = createRootFolder()
    await db.putNode(root)
    set({ nodes: [root], rootFolderId: root.id })
  },
}))
