import type { VaultNode } from './types'
import { getChildren } from './tree'

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024 // 50MB, keeps IndexedDB usage sane for a demo
export const INVALID_NAME_CHARS = /[/\\:*?"<>|]/

export interface NameValidationResult {
  ok: boolean
  error?: string
}

export function validateName(rawName: string): NameValidationResult {
  const name = rawName.trim()
  if (name.length === 0) return { ok: false, error: 'Name cannot be empty.' }
  if (name.length > 120) return { ok: false, error: 'Name is too long (120 characters max).' }
  if (INVALID_NAME_CHARS.test(name)) {
    return { ok: false, error: 'Name cannot contain / \\ : * ? " < > |' }
  }
  return { ok: true }
}

export function isNameTaken(
  nodes: VaultNode[],
  parentId: string,
  name: string,
  excludeId?: string,
): boolean {
  const normalized = name.trim().toLowerCase()
  return getChildren(nodes, parentId).some(
    (n) => n.id !== excludeId && n.name.trim().toLowerCase() === normalized,
  )
}

/** Splits "Report.pdf" into ["Report", ".pdf"]; folders have no extension. */
function splitName(name: string): [string, string] {
  const dot = name.lastIndexOf('.')
  if (dot <= 0) return [name, '']
  return [name.slice(0, dot), name.slice(dot)]
}

/**
 * Returns `name` if it's free among active siblings, otherwise appends
 * " (1)", " (2)", etc. before the extension until a free name is found —
 * mirrors how Drive/Dropbox handle same-name uploads instead of blocking them.
 */
export function getUniqueName(nodes: VaultNode[], parentId: string, name: string): string {
  if (!isNameTaken(nodes, parentId, name)) return name
  const [base, ext] = splitName(name)
  let n = 1
  let candidate = `${base} (${n})${ext}`
  while (isNameTaken(nodes, parentId, candidate)) {
    n++
    candidate = `${base} (${n})${ext}`
  }
  return candidate
}

export interface FileValidationResult {
  ok: boolean
  error?: string
}

export function validateUploadFile(file: File): FileValidationResult {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  if (!isPdf) return { ok: false, error: 'Only PDF files are supported.' }
  if (file.size === 0) return { ok: false, error: 'File is empty.' }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { ok: false, error: `File exceeds the ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB limit.` }
  }
  return { ok: true }
}
