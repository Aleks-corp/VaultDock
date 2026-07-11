import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { ActivityEntry, VaultNode } from './types'

interface VaultDB extends DBSchema {
  nodes: {
    key: string
    value: VaultNode
    indexes: { 'by-parent': string }
  }
  blobs: {
    key: string
    value: { nodeId: string; blob: Blob }
  }
  activity: {
    key: string
    value: ActivityEntry
    indexes: { 'by-node': string }
  }
}

const DB_NAME = 'vaultdock'
// v2: replaced the multi-"Data Room" schema with a single flat "My Files" tree.
// Bumping this wipes any pre-v2 local data rather than migrating it (see upgrade below).
const DB_VERSION = 2

let dbPromise: Promise<IDBPDatabase<VaultDB>> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<VaultDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Wipe any legacy (Data Room-era) object stores — the schema is not compatible.
        for (const name of Array.from(db.objectStoreNames)) {
          db.deleteObjectStore(name)
        }

        const nodes = db.createObjectStore('nodes', { keyPath: 'id' })
        nodes.createIndex('by-parent', 'parentId')

        db.createObjectStore('blobs', { keyPath: 'nodeId' })

        const activity = db.createObjectStore('activity', { keyPath: 'id' })
        activity.createIndex('by-node', 'nodeId')
      },
    })
  }
  return dbPromise
}

export async function loadAll() {
  const db = await getDb()
  const nodes = await db.getAll('nodes')
  return { nodes }
}

export async function putNode(node: VaultNode) {
  const db = await getDb()
  await db.put('nodes', node)
}

export async function putNodes(nodes: VaultNode[]) {
  const db = await getDb()
  const tx = db.transaction('nodes', 'readwrite')
  await Promise.all([...nodes.map((n) => tx.store.put(n)), tx.done])
}

export async function deleteNodeRecords(ids: string[]) {
  if (ids.length === 0) return
  const db = await getDb()
  const tx = db.transaction('nodes', 'readwrite')
  await Promise.all([...ids.map((id) => tx.store.delete(id)), tx.done])
}

export async function putBlob(nodeId: string, blob: Blob) {
  const db = await getDb()
  await db.put('blobs', { nodeId, blob })
}

export async function getBlob(nodeId: string): Promise<Blob | undefined> {
  const db = await getDb()
  const record = await db.get('blobs', nodeId)
  return record?.blob
}

export async function deleteBlobs(nodeIds: string[]) {
  if (nodeIds.length === 0) return
  const db = await getDb()
  const tx = db.transaction('blobs', 'readwrite')
  await Promise.all([...nodeIds.map((id) => tx.store.delete(id)), tx.done])
}

export async function putActivity(entry: ActivityEntry) {
  const db = await getDb()
  await db.put('activity', entry)
}

export async function getActivityForNode(nodeId: string): Promise<ActivityEntry[]> {
  const db = await getDb()
  const entries = await db.getAllFromIndex('activity', 'by-node', nodeId)
  return entries.sort((a, b) => b.timestamp - a.timestamp)
}

export async function deleteActivityForNodes(nodeIds: string[]) {
  if (nodeIds.length === 0) return
  const db = await getDb()
  const tx = db.transaction('activity', 'readwrite')
  const idSet = new Set(nodeIds)
  let cursor = await tx.store.openCursor()
  const deletions: Promise<void>[] = []
  while (cursor) {
    if (idSet.has(cursor.value.nodeId)) {
      deletions.push(cursor.delete())
    }
    cursor = await cursor.continue()
  }
  await Promise.all([...deletions, tx.done])
}

export async function clearAllData() {
  const db = await getDb()
  const tx = db.transaction(['nodes', 'blobs', 'activity'], 'readwrite')
  await Promise.all([
    tx.objectStore('nodes').clear(),
    tx.objectStore('blobs').clear(),
    tx.objectStore('activity').clear(),
    tx.done,
  ])
}
