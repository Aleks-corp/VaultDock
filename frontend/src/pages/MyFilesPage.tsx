import { useEffect, useMemo, useState } from "react";
import {
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { toast } from "sonner";
import { UploadCloud } from "lucide-react";
import { useVaultStore } from "@/lib/store";
import { getChildren, getPath } from "@/lib/tree";
import { cn } from "@/lib/utils";
import { FilesBreadcrumb } from "@/components/room/FilesBreadcrumb";
import { FilesToolbar } from "@/components/room/FilesToolbar";
import { NodeTable } from "@/components/room/NodeTable";
import { NodeGrid } from "@/components/room/NodeGrid";
import { FilePreviewDialog } from "@/components/room/FilePreviewDialog";
import { EmptyFolderState } from "@/components/room/EmptyFolderState";
import { DetailsPanel } from "@/components/room/DetailsPanel";
import type {
  FileNode,
  KindFilter,
  SortDirection,
  SortField,
  VaultNode,
  ViewMode,
} from "@/lib/types";

export function MyFilesPage() {
  const { folderId } = useParams<{ folderId?: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const nodes = useVaultStore((s) => s.nodes);
  const rootFolderId = useVaultStore((s) => s.rootFolderId);
  const uploadFiles = useVaultStore((s) => s.uploadFiles);
  const softDeleteNodes = useVaultStore((s) => s.softDeleteNodes);
  const restoreNodes = useVaultStore((s) => s.restoreNodes);

  const currentFolderId = folderId ?? rootFolderId ?? undefined;
  const currentFolder = currentFolderId
    ? nodes.find((n) => n.id === currentFolderId)
    : undefined;

  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewNode, setPreviewNode] = useState<FileNode | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [currentFolderId]);

  const children = useMemo(() => {
    if (!currentFolderId) return [];
    return getChildren(nodes, currentFolderId);
  }, [nodes, currentFolderId]);

  const filteredChildren = useMemo(
    () =>
      kindFilter === "all"
        ? children
        : children.filter((n) => n.kind === kindFilter),
    [children, kindFilter],
  );

  const sortedChildren = useMemo(() => {
    const dir = sortDirection === "asc" ? 1 : -1;
    return [...filteredChildren].sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
      switch (sortField) {
        case "updatedAt":
          return (a.updatedAt - b.updatedAt) * dir;
        case "size":
          return (
            ((a.kind === "file" ? a.size : 0) -
              (b.kind === "file" ? b.size : 0)) *
            dir
          );
        default:
          return a.name.localeCompare(b.name) * dir;
      }
    });
  }, [filteredChildren, sortField, sortDirection]);

  const path = useMemo(
    () => (currentFolderId ? getPath(nodes, currentFolderId) : []),
    [nodes, currentFolderId],
  );

  const selectedNodes = useMemo(
    () => nodes.filter((n) => selectedIds.has(n.id)),
    [nodes, selectedIds],
  );

  useEffect(() => {
    const selectId = searchParams.get("select");
    if (!selectId) return;
    const node = nodes.find((n) => n.id === selectId);
    if (node && node.kind === "file") setPreviewNode(node);
    const next = new URLSearchParams(searchParams);
    next.delete("select");
    setSearchParams(next, { replace: true });
  }, [searchParams, nodes, setSearchParams]);

  if (!rootFolderId) return null;
  if (
    !currentFolder ||
    currentFolder.kind !== "folder" ||
    currentFolder.deletedAt !== null
  ) {
    return <Navigate to="/" replace />;
  }

  function toggleSelect(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleSelectAll(checked: boolean) {
    setSelectedIds(
      checked ? new Set(sortedChildren.map((n) => n.id)) : new Set(),
    );
  }

  function handleOpen(node: VaultNode) {
    if (node.kind === "folder") {
      navigate(`/folder/${node.id}`);
    } else {
      setPreviewNode(node);
    }
  }

  async function handleFilesSelected(files: FileList) {
    const { created, rejected } = await uploadFiles(
      currentFolder!.id,
      Array.from(files),
    );
    if (created.length > 0) {
      toast.success(
        `Uploaded ${created.length} file${created.length === 1 ? "" : "s"}`,
      );
    }
    if (rejected.length > 0) {
      toast.error(
        rejected.length === 1
          ? `"${rejected[0].name}" was skipped: ${rejected[0].reason}`
          : `${rejected.length} files were skipped`,
        {
          description:
            rejected.length > 1
              ? rejected.map((r) => `${r.name}: ${r.reason}`).join("\n")
              : undefined,
        },
      );
    }
  }

  async function handleBulkDelete() {
    const ids = [...selectedIds];
    await softDeleteNodes(ids);
    setSelectedIds(new Set());
    toast.success(
      `${ids.length} item${ids.length === 1 ? "" : "s"} moved to trash`,
      {
        action: { label: "Undo", onClick: () => restoreNodes(ids) },
      },
    );
  }

  return (
    <div
      className="relative flex h-full flex-col"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setIsDraggingOver(true);
        }
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setIsDraggingOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingOver(false);
        if (e.dataTransfer.files.length > 0)
          handleFilesSelected(e.dataTransfer.files);
      }}
    >
      {isDraggingOver && (
        <div className="pointer-events-none absolute inset-0 z-10 m-3 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary bg-primary/5 text-primary">
          <UploadCloud className="size-8" strokeWidth={1.75} />
          <p className="text-sm font-medium">Drop PDF files to upload</p>
        </div>
      )}

      <div className="border-b border-border px-8 py-5">
        <FilesBreadcrumb path={path} />
        <FilesToolbar
          parentId={currentFolder.id}
          onFilesSelected={handleFilesSelected}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          kindFilter={kindFilter}
          onKindFilterChange={setKindFilter}
          sortField={sortField}
          sortDirection={sortDirection}
          onSortChange={(field, direction) => {
            setSortField(field);
            setSortDirection(direction);
          }}
          selectedCount={selectedIds.size}
          onBulkDelete={handleBulkDelete}
          onClearSelection={() => setSelectedIds(new Set())}
        />
      </div>

      <div className="flex min-h-0 flex-1">
        <div
          className={cn(
            "flex-1 overflow-y-auto p-8",
            sortedChildren.length === 0 && "flex items-center justify-center",
          )}
        >
          {sortedChildren.length === 0 ? (
            <EmptyFolderState
              filtered={kindFilter !== "all" && children.length > 0}
            />
          ) : viewMode === "list" ? (
            <NodeTable
              nodes={sortedChildren}
              allNodes={nodes}
              selectedIds={selectedIds}
              onToggle={toggleSelect}
              onToggleAll={toggleSelectAll}
              onOpen={handleOpen}
            />
          ) : (
            <NodeGrid
              nodes={sortedChildren}
              allNodes={nodes}
              selectedIds={selectedIds}
              onToggle={toggleSelect}
              onOpen={handleOpen}
            />
          )}
        </div>

        <DetailsPanel
          currentFolder={currentFolder}
          selectedNodes={selectedNodes}
          allNodes={nodes}
          onOpen={handleOpen}
          onClearSelection={() => setSelectedIds(new Set())}
        />
      </div>

      <FilePreviewDialog
        node={previewNode}
        open={!!previewNode}
        onOpenChange={(o) => !o && setPreviewNode(null)}
      />
    </div>
  );
}
