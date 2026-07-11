import { useState } from "react";
import {
  Download,
  Eye,
  FolderOpen,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RenameDialog } from "@/components/dialogs/RenameDialog";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { NodeIcon } from "./NodeIcon";
import { useVaultStore } from "@/lib/store";
import { countContents, isFile } from "@/lib/tree";
import { downloadFile } from "@/lib/blob";
import { formatBytes, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { VaultNode } from "@/lib/types";

interface NodeGridProps {
  nodes: VaultNode[];
  allNodes: VaultNode[];
  selectedIds: Set<string>;
  onToggle: (id: string, checked: boolean) => void;
  onOpen: (node: VaultNode) => void;
}

export function NodeGrid({
  nodes,
  allNodes,
  selectedIds,
  onToggle,
  onOpen,
}: NodeGridProps) {
  const renameNode = useVaultStore((s) => s.renameNode);
  const softDeleteNodes = useVaultStore((s) => s.softDeleteNodes);
  const restoreNodes = useVaultStore((s) => s.restoreNodes);
  const [renameTarget, setRenameTarget] = useState<VaultNode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VaultNode | null>(null);

  const deleteCounts =
    deleteTarget && deleteTarget.kind === "folder"
      ? countContents(allNodes, deleteTarget.id)
      : null;

  async function handleDelete(node: VaultNode) {
    await softDeleteNodes([node.id]);
    toast.success(`"${node.name}" moved to trash`, {
      action: { label: "Undo", onClick: () => restoreNodes([node.id]) },
    });
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {nodes.map((node) => {
          const selected = selectedIds.has(node.id);
          return (
            <div
              key={node.id}
              role="button"
              tabIndex={0}
              onClick={() => onOpen(node)}
              onKeyDown={(e) => e.key === "Enter" && onOpen(node)}
              className={cn(
                "group flex cursor-pointer flex-col rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:shadow-sm",
                selected && "border-primary/50 bg-primary/5",
              )}
            >
              <div className="flex flex-col items-start justify-between">
                <div
                  className="flex items-center justify-between w-full gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    checked={selected}
                    onCheckedChange={(c) => onToggle(node.id, c === true)}
                    aria-label={`Select ${node.name}`}
                    className={cn(
                      "opacity-0 group-hover:opacity-100",
                      selected && "opacity-100",
                    )}
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => onOpen(node)}>
                        {node.kind === "folder" ? (
                          <FolderOpen className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                        Open
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setRenameTarget(node)}>
                        <Pencil className="size-4" /> Rename
                      </DropdownMenuItem>
                      {isFile(node) && (
                        <DropdownMenuItem onSelect={() => downloadFile(node)}>
                          <Download className="size-4" /> Download
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => setDeleteTarget(node)}
                      >
                        <Trash2 className="size-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex w-full items-center justify-center">
                  <span className="flex size-28 items-center justify-center">
                    <NodeIcon node={node} className="size-28" />
                  </span>
                </div>
              </div>

              <p className="mt-3 truncate text-sm font-semibold text-foreground">
                {node.name}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {isFile(node) ? formatBytes(node.size) : "Folder"} ·{" "}
                {formatRelative(node.updatedAt)}
              </p>
            </div>
          );
        })}
      </div>

      {renameTarget && (
        <RenameDialog
          open={!!renameTarget}
          onOpenChange={(o) => !o && setRenameTarget(null)}
          title={
            renameTarget.kind === "folder" ? "Rename folder" : "Rename file"
          }
          label={renameTarget.kind === "folder" ? "Folder name" : "File name"}
          initialName={renameTarget.name}
          onSubmit={(name) => renameNode(renameTarget.id, name)}
        />
      )}
      {deleteTarget && (
        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(o) => !o && setDeleteTarget(null)}
          title={`Delete "${deleteTarget.name}"?`}
          description={
            deleteTarget.kind === "folder" ? (
              <>
                This moves the folder to Trash
                {deleteCounts &&
                  deleteCounts.folders + deleteCounts.files > 0 && (
                    <>
                      {" "}
                      along with{" "}
                      <strong>
                        {deleteCounts.folders} folder
                        {deleteCounts.folders === 1 ? "" : "s"} and{" "}
                        {deleteCounts.files} file
                        {deleteCounts.files === 1 ? "" : "s"}
                      </strong>{" "}
                      inside it
                    </>
                  )}
                . You can restore it from Trash later.
              </>
            ) : (
              "This moves the file to Trash. You can restore it later."
            )
          }
          confirmLabel="Move to trash"
          destructive
          onConfirm={() => handleDelete(deleteTarget)}
        />
      )}
    </>
  );
}
