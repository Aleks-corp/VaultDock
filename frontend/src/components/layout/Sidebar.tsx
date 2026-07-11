import { NavLink, useLocation } from 'react-router-dom'
import { Clock, FolderClosed, Settings, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo } from './Logo'
import { StorageUsageCard } from './StorageUsageCard'

const NAV_ITEMS = [
  { to: '/', label: 'My Files', icon: FolderClosed, end: true },
  { to: '/recent', label: 'Recent', icon: Clock, end: false },
  { to: '/trash', label: 'Trash', icon: Trash2, end: false },
]

export function Sidebar() {
  const location = useLocation()

  return (
    <aside className="flex h-full w-[234px] shrink-0 flex-col border-r border-border bg-sidebar px-3 py-5">
      <div className="px-1">
        <Logo />
      </div>

      <nav className="mt-7 flex flex-col gap-0.5">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => {
          // "My Files" also covers subfolder routes (/folder/:id), which NavLink's own
          // end-matching can't express for a root path without matching every route.
          const forceActive = to === '/' && location.pathname.startsWith('/folder/')
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive || forceActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )
              }
            >
              <Icon className="size-4" strokeWidth={2} />
              {label}
            </NavLink>
          )
        })}
      </nav>

      <div className="my-4 border-t border-border" />

      <NavLink
        to="/settings"
        className={({ isActive }) =>
          cn(
            'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            isActive
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          )
        }
      >
        <Settings className="size-4" strokeWidth={2} />
        Settings
      </NavLink>

      <div className="flex-1" />

      <StorageUsageCard />
    </aside>
  )
}
