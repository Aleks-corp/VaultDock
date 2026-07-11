import type { VaultNode } from './types'

export interface FolderColorOption {
  id: string
  label: string
  /** Solid swatch color, used as a small fallback dot if the icon image fails to load. */
  dot: string
  /** Colored folder icon image, from public/logo. */
  icon: string
}

export const FOLDER_COLORS: FolderColorOption[] = [
  { id: 'blue', label: 'Blue', dot: 'bg-blue-500', icon: '/logo/blue.png' },
  { id: 'green', label: 'Green', dot: 'bg-emerald-500', icon: '/logo/green.png' },
  { id: 'red', label: 'Red', dot: 'bg-red-500', icon: '/logo/red.png' },
  { id: 'yellow', label: 'Yellow', dot: 'bg-amber-400', icon: '/logo/yellow.png' },
]

export const DEFAULT_FOLDER_COLOR = FOLDER_COLORS[0].id

/** File icon, fixed regardless of node — VaultDock only ever stores PDFs. */
export const FILE_ICON = '/logo/files.png'

export function getFolderColor(id?: string): FolderColorOption {
  return FOLDER_COLORS.find((c) => c.id === id) ?? FOLDER_COLORS[0]
}

/** Icon image for any node — colored per-folder, fixed PDF icon for files. */
export function getNodeVisual(node: Pick<VaultNode, 'kind'> & { color?: string }): { icon: string } {
  if (node.kind === 'folder') {
    return { icon: getFolderColor(node.color).icon }
  }
  return { icon: FILE_ICON }
}
