import { useId, useState } from 'react'
import { FolderPlus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useVaultStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { DEFAULT_FOLDER_COLOR, FOLDER_COLORS } from '@/lib/folderColors'
import { Check } from 'lucide-react'

export function NewFolderDialog({ parentId }: { parentId: string }) {
  const createFolder = useVaultStore((s) => s.createFolder)
  const inputId = useId()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState(DEFAULT_FOLDER_COLOR)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setName('')
      setColor(DEFAULT_FOLDER_COLOR)
      setError(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await createFolder(parentId, name, color)
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FolderPlus className="size-4" />
          New Folder
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create a folder</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-1.5">
            <Label htmlFor={inputId}>Folder name</Label>
            <Input
              id={inputId}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Financials"
              autoFocus
              maxLength={120}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <div className="mt-4 space-y-1.5">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Folder color">
              {FOLDER_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={color === c.id}
                  aria-label={c.label}
                  onClick={() => setColor(c.id)}
                  className={cn(
                    'relative flex size-14 items-center justify-center rounded-lg ring-offset-2 ring-offset-background transition-shadow',
                    color === c.id ? 'ring-2 ring-foreground' : 'hover:ring-2 hover:ring-border',
                  )}
                >
                  <img src={c.icon} alt={c.label} draggable={false} className="size-11 object-contain select-none" />
                  {color === c.id && (
                    <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-foreground text-background">
                      <Check className="size-2.5" strokeWidth={3} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || name.trim().length === 0}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
