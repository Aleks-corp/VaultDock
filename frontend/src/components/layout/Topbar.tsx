import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Search, Settings } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NodeIcon } from '@/components/room/NodeIcon'
import { useVaultStore } from '@/lib/store'
import { useAuthStore } from '@/lib/authStore'
import { getNodeLocationLabel, searchNodes } from '@/lib/tree'
import type { VaultNode } from '@/lib/types'

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

const MAX_RESULTS = 8

export function Topbar() {
  const navigate = useNavigate()
  const nodes = useVaultStore((s) => s.nodes)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const matchedNodes = useMemo<VaultNode[]>(() => {
    if (!query.trim()) return []
    return searchNodes(nodes, query).slice(0, MAX_RESULTS)
  }, [nodes, query])

  const hasResults = matchedNodes.length > 0

  function reset() {
    setQuery('')
    setOpen(false)
  }

  function goToNode(node: VaultNode) {
    if (node.kind === 'folder') {
      navigate(`/folder/${node.id}`)
    } else if (node.parentId) {
      navigate(`/folder/${node.parentId}?select=${node.id}`)
    }
    reset()
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-8">
      <Popover open={open && hasResults}>
        <PopoverAnchor asChild>
          <div className="relative w-full max-w-[519px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  reset()
                  inputRef.current?.blur()
                }
              }}
              placeholder="Search files and folders..."
              className="h-9 pl-9"
            />
          </div>
        </PopoverAnchor>
        <PopoverContent
          align="start"
          sideOffset={6}
          className="w-[519px] p-1.5"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={() => setOpen(false)}
        >
          <div className="max-h-80 overflow-y-auto">
            {matchedNodes.length > 0 && (
              <div>
                <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Files &amp; Folders</p>
                {matchedNodes.map((node) => (
                  <button
                    key={node.id}
                    onClick={() => goToNode(node)}
                    className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                  >
                    <NodeIcon node={node} className="size-7 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{node.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {getNodeLocationLabel(nodes, node)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger className="ml-4 shrink-0 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <Avatar>
              <AvatarImage src={user.avatarUrl ?? undefined} alt={user.name} />
              <AvatarFallback>{initials(user.name || user.email)}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col gap-0.5 py-1">
              <span className="truncate text-sm font-medium text-foreground">{user.name}</span>
              <span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleLogout}>
              <LogOut /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  )
}
