import { useEffect, useState } from "react";
import {
  Download,
  Eye,
  FilePlus,
  FileUp,
  FolderOpen,
  FolderPlus,
  History,
  PencilLine,
  RotateCcw,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { RenameDialog } from "@/components/dialogs/RenameDialog";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { NodeIcon } from "./NodeIcon";
import { useVaultStore } from "@/lib/store";
import { getActivityForNode } from "@/lib/db";
import { countContents, getNodeLocationLabel, isFile } from "@/lib/tree";
import { formatBytes, formatDate, formatRelative } from "@/lib/format";
import { downloadFile } from "@/lib/blob";
import type {
  ActivityAction,
  ActivityEntry,
  FolderNode,
  VaultNode,
} from "@/lib/types";

const ACTION_LABEL: Record<ActivityAction, string> = {
  folder_created: "Folder created",
  file_uploaded: "File uploaded",
  renamed: "Renamed",
  moved_to_trash: "Moved to trash",
  restored: "Restored",
  deleted_forever: "Deleted forever",
};

const ACTION_ICON: Record<ActivityAction, typeof FilePlus> = {
  folder_created: FolderPlus,
  file_uploaded: FileUp,
  renamed: PencilLine,
  moved_to_trash: Trash2,
  restored: RotateCcw,
  deleted_forever: XCircle,
};

function ActivityList({ activity }: { activity: ActivityEntry[] }) {
  if (activity.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No activity recorded.</p>
    );
  }
  return (
    <ScrollArea className="max-h-64">
      <ul className="space-y-3 pr-3">
        {activity.map((entry) => {
          const Icon = ACTION_ICON[entry.action];
          return (
            <li key={entry.id} className="flex items-start gap-2.5 text-sm">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Icon className="size-3.5" />
              </span>
              <span className="min-w-0">
                <span className="block text-foreground">
                  {ACTION_LABEL[entry.action]}
                </span>
                {entry.detail && (
                  <span className="block text-xs text-muted-foreground">
                    {entry.detail}
                  </span>
                )}
                <span className="block text-xs text-muted-foreground">
                  {formatRelative(entry.timestamp)}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </ScrollArea>
  );
}

interface DetailsPanelProps {
  currentFolder: FolderNode;
  selectedNodes: VaultNode[];
  allNodes: VaultNode[];
  onOpen: (node: VaultNode) => void;
  onClearSelection: () => void;
}

/**
 * Persistent right-side panel (always occupies layout space, per design spec).
 * - Nothing selected -> shows info for the folder currently being browsed.
 * - 1 item selected  -> shows that item's details + activity.
 * - 2+ items selected -> shows an aggregated summary of the selection.
 */
export function DetailsPanel({
  currentFolder,
  selectedNodes,
  allNodes,
  onOpen,
  onClearSelection,
}: DetailsPanelProps) {
  const renameNode = useVaultStore((s) => s.renameNode);
  const softDeleteNodes = useVaultStore((s) => s.softDeleteNodes);
  const restoreNodes = useVaultStore((s) => s.restoreNodes);

  const [renameTarget, setRenameTarget] = useState<VaultNode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VaultNode[] | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);

  const isMulti = selectedNodes.length >= 2;
  const singleNode: VaultNode | null = isMulti
    ? null
    : selectedNodes.length === 1
      ? selectedNodes[0]
      : currentFolder;

  useEffect(() => {
    if (!singleNode) {
      setActivity([]);
      return;
    }
    let cancelled = false;
    getActivityForNode(singleNode.id).then((entries) => {
      if (!cancelled) setActivity(entries);
    });
    return () => {
      cancelled = true;
    };
  }, [singleNode]);

  async function handleDelete(nodes: VaultNode[]) {
    const ids = nodes.map((n) => n.id);
    await softDeleteNodes(ids);
    onClearSelection();
    toast.success(
      `${ids.length} item${ids.length === 1 ? "" : "s"} moved to trash`,
      {
        action: { label: "Undo", onClick: () => restoreNodes(ids) },
      },
    );
  }

  if (isMulti) {
    const folderCount = selectedNodes.filter((n) => n.kind === "folder").length;
    const fileNodes = selectedNodes.filter(isFile);
    const totalSize = fileNodes.reduce((sum, f) => sum + f.size, 0);

    return (
      <aside className="flex w-[320px] shrink-0 flex-col border-l border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">
            {selectedNodes.length} items selected
          </h2>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Selected items
            </p>
            <ul className="flex gap-2 space-y-2">
              {selectedNodes.map((n) => (
                <li
                  key={n.id}
                  className="flex flex-col items-center gap-2 text-sm"
                >
                  <NodeIcon node={n} className="size-11 shrink-0" />
                  <span className="truncate text-foreground">{n.name}</span>
                </li>
              ))}
            </ul>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
            <dt className="text-muted-foreground">Folders</dt>
            <dd className="text-foreground">{folderCount}</dd>
            <dt className="text-muted-foreground">Files</dt>
            <dd className="text-foreground">{fileNodes.length}</dd>
            <dt className="text-muted-foreground">Total size</dt>
            <dd className="text-foreground">
              {totalSize > 0 ? formatBytes(totalSize) : "—"}
            </dd>
          </dl>
        </div>

        <div className="border-t border-border px-5 py-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Quick actions
          </p>
          <div className="space-y-1.5">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={onClearSelection}
            >
              <X className="size-4" /> Clear selection
            </Button>
            <Button
              variant="destructive"
              className="w-full justify-start"
              onClick={() => setDeleteTarget(selectedNodes)}
            >
              <Trash2 className="size-4" /> Delete {selectedNodes.length} items
            </Button>
          </div>
        </div>

        {deleteTarget && (
          <ConfirmDialog
            open
            onOpenChange={(o) => !o && setDeleteTarget(null)}
            title={`Delete ${deleteTarget.length} items?`}
            description="This moves the selected items to Trash. You can restore them later."
            confirmLabel="Move to trash"
            destructive
            onConfirm={() => handleDelete(deleteTarget)}
          />
        )}
      </aside>
    );
  }

  if (!singleNode) return null;

  const node = singleNode;
  const counts =
    node.kind === "folder" ? countContents(allNodes, node.id) : null;
  const location = getNodeLocationLabel(allNodes, node);
  const isRootFolder = node.kind === "folder" && node.isRoot;

  return (
    <aside className="flex w-[320px] shrink-0 flex-col border-l border-border bg-card">
      <div className="flex flex-col items-start gap-2 border-b border-border px-5 py-4">
        <NodeIcon node={node} className="size-24 shrink-0" />
        <h2 className="truncate text-base font-semibold text-foreground">
          {node.name}
        </h2>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
          <dt className="text-muted-foreground">Type</dt>
          <dd className="text-foreground">
            {node.kind === "folder" ? "Folder" : "PDF file"}
          </dd>

          {isFile(node) && (
            <>
              <dt className="text-muted-foreground">Size</dt>
              <dd className="text-foreground">{formatBytes(node.size)}</dd>
            </>
          )}

          {counts && (
            <>
              <dt className="text-muted-foreground">Contains</dt>
              <dd className="text-foreground">
                {counts.folders} folder{counts.folders === 1 ? "" : "s"},{" "}
                {counts.files} file
                {counts.files === 1 ? "" : "s"}
              </dd>
            </>
          )}

          <dt className="text-muted-foreground">Location</dt>
          <dd className="truncate text-foreground" title={location}>
            {location}
          </dd>

          <dt className="text-muted-foreground">Modified</dt>
          <dd className="text-foreground">{formatDate(node.updatedAt)}</dd>

          <dt className="text-muted-foreground">Created</dt>
          <dd className="text-foreground">{formatDate(node.createdAt)}</dd>
        </dl>

        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <History className="size-3.5" /> Recent activity
          </p>
          <ActivityList activity={activity} />
        </div>
      </div>

      <div className="border-t border-border px-5 py-4">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Quick actions
        </p>
        <div className="space-y-1.5">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => onOpen(node)}
          >
            {node.kind === "folder" ? (
              <FolderOpen className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
            {node.kind === "folder" ? "Open" : "View"}
          </Button>
          {!isRootFolder && (
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setRenameTarget(node)}
            >
              <PencilLine className="size-4" /> Rename
            </Button>
          )}
          {isFile(node) && (
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => downloadFile(node)}
            >
              <Download className="size-4" /> Download
            </Button>
          )}
          {!isRootFolder && (
            <Button
              variant="destructive"
              className="w-full justify-start"
              onClick={() => setDeleteTarget([node])}
            >
              <Trash2 className="size-4" /> Delete
            </Button>
          )}
        </div>
      </div>

      {renameTarget && (
        <RenameDialog
          open
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
          open
          onOpenChange={(o) => !o && setDeleteTarget(null)}
          title={`Delete "${deleteTarget[0].name}"?`}
          description={
            deleteTarget[0].kind === "folder" ? (
              <>This moves the folder to Trash. You can restore it later.</>
            ) : (
              "This moves the file to Trash. You can restore it later."
            )
          }
          confirmLabel="Move to trash"
          destructive
          onConfirm={() => handleDelete(deleteTarget)}
        />
      )}
    </aside>
  );
}
