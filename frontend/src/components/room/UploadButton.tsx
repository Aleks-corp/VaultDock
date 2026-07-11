import { useRef } from 'react'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function UploadButton({ onFilesSelected }: { onFilesSelected: (files: FileList) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <Button onClick={() => inputRef.current?.click()}>
        <Upload className="size-4" />
        Upload PDF
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) onFilesSelected(e.target.files)
          e.target.value = ''
        }}
      />
    </>
  )
}
