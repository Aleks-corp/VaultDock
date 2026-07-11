import { getBlob } from './db'
import type { FileNode } from './types'

export async function getFileObjectUrl(nodeId: string): Promise<string | null> {
  const blob = await getBlob(nodeId)
  if (!blob) return null
  return URL.createObjectURL(blob)
}

export async function downloadFile(node: FileNode): Promise<void> {
  const url = await getFileObjectUrl(node.id)
  if (!url) throw new Error('File data not found.')
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = node.name
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
