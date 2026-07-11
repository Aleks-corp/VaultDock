import { LayoutGrid, List, Trash2, X } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { NewFolderDialog } from "./NewFolderDialog";
import { UploadButton } from "./UploadButton";
import type {
  KindFilter,
  SortDirection,
  SortField,
  ViewMode,
} from "@/lib/types";

interface SortOption {
  value: string;
  label: string;
  field: SortField;
  direction: SortDirection;
}

const SORT_OPTIONS: SortOption[] = [
  { value: "name-asc", label: "Name (A–Z)", field: "name", direction: "asc" },
  { value: "name-desc", label: "Name (Z–A)", field: "name", direction: "desc" },
  {
    value: "updatedAt-desc",
    label: "Last modified (newest)",
    field: "updatedAt",
    direction: "desc",
  },
  {
    value: "updatedAt-asc",
    label: "Last modified (oldest)",
    field: "updatedAt",
    direction: "asc",
  },
  {
    value: "size-desc",
    label: "Size (largest)",
    field: "size",
    direction: "desc",
  },
  {
    value: "size-asc",
    label: "Size (smallest)",
    field: "size",
    direction: "asc",
  },
];

interface FilesToolbarProps {
  parentId: string;
  onFilesSelected: (files: FileList) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  kindFilter: KindFilter;
  onKindFilterChange: (filter: KindFilter) => void;
  sortField: SortField;
  sortDirection: SortDirection;
  onSortChange: (field: SortField, direction: SortDirection) => void;
  selectedCount: number;
  onBulkDelete: () => void;
  onClearSelection: () => void;
}

export function FilesToolbar({
  parentId,
  onFilesSelected,
  viewMode,
  onViewModeChange,
  kindFilter,
  onKindFilterChange,
  sortField,
  sortDirection,
  onSortChange,
  selectedCount,
  onBulkDelete,
  onClearSelection,
}: FilesToolbarProps) {
  const currentSortValue = `${sortField}-${sortDirection}`;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {selectedCount > 0 ? (
          <>
            <span className="px-1 text-sm font-medium text-foreground">
              {selectedCount} selected
            </span>
            <Button variant="outline" size="sm" onClick={onClearSelection}>
              <X className="size-4" />
              Clear
            </Button>
            <Button variant="destructive" size="sm" onClick={onBulkDelete}>
              <Trash2 className="size-4" />
              Delete
            </Button>
          </>
        ) : (
          <>
            <NewFolderDialog parentId={parentId} />
            <UploadButton onFilesSelected={onFilesSelected} />
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Tabs
          value={kindFilter}
          onValueChange={(v) => onKindFilterChange(v as KindFilter)}
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="folder">Folders</TabsTrigger>
            <TabsTrigger value="file">Files</TabsTrigger>
          </TabsList>
        </Tabs>

        <Select
          value={currentSortValue}
          onValueChange={(v) => {
            const opt = SORT_OPTIONS.find((o) => o.value === v);
            if (opt) onSortChange(opt.field, opt.direction);
          }}
        >
          <SelectTrigger size="sm" className="w-[188px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center rounded-lg border border-input p-0.5">
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={() => onViewModeChange("list")}
            aria-label="List view"
          >
            <List className="size-4" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={() => onViewModeChange("grid")}
            aria-label="Grid view"
          >
            <LayoutGrid className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
