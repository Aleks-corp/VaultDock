import { useNavigate } from 'react-router-dom'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import type { FolderNode } from '@/lib/types'

/** `path` runs from the "My Files" root folder to the current folder, inclusive. */
export function FilesBreadcrumb({ path }: { path: FolderNode[] }) {
  const navigate = useNavigate()
  const subfolders = path.slice(1)

  return (
    <Breadcrumb>
      <BreadcrumbList className="flex-nowrap">
        <BreadcrumbItem>
          {subfolders.length === 0 ? (
            <BreadcrumbPage className="text-lg font-semibold text-foreground">My Files</BreadcrumbPage>
          ) : (
            <BreadcrumbLink asChild>
              <button
                onClick={() => navigate('/')}
                className="text-lg font-semibold text-muted-foreground hover:text-foreground"
              >
                My Files
              </button>
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>
        {subfolders.map((folder, i) => {
          const isLast = i === subfolders.length - 1
          return (
            <span key={folder.id} className="flex items-center gap-1.5">
              <BreadcrumbSeparator className="[&>svg]:size-4" />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="text-lg font-semibold text-foreground">{folder.name}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <button
                      onClick={() => navigate(`/folder/${folder.id}`)}
                      className="text-lg font-semibold text-muted-foreground hover:text-foreground"
                    >
                      {folder.name}
                    </button>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </span>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
