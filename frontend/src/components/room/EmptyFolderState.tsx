import { SearchX } from "lucide-react";

export function EmptyFolderState({ filtered }: { filtered: boolean }) {
  return (
    <div className="mt-16 flex flex-col items-center justify-center gap-3 text-center">
      {filtered ? (
        <span className="flex size-28 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <SearchX className="size-6" strokeWidth={1.75} />
        </span>
      ) : (
        <span className="flex size-28 items-center justify-center">
          <img
            src="/logo/empty.png"
            alt=""
            draggable={false}
            className="shrink-0 object-contain select-none size-28"
          />
        </span>
      )}

      <div>
        <p className="font-medium text-foreground">
          {filtered ? "No matches" : "This folder is empty"}
        </p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {filtered
            ? "No items match the current filter."
            : "Create a folder or upload a PDF to get started."}
        </p>
      </div>
    </div>
  );
}
