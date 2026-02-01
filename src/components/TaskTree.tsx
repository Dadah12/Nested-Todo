import React, { useMemo } from "react";
import type { TodoNode } from "../types";
import TaskRow from "./TaskRow";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

export default function TaskTree({
  roots,
  editingId,
  setEditingId,
  onAddChild,
  onDelete,
  onRename,
  onToggleCheck,
  onToggleCollapse,
  onRequestQuickAddUnder,
  searchQuery,
}: {
  roots: TodoNode[];
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onToggleCheck: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  onRequestQuickAddUnder: (id: string) => void;
  searchQuery: string;
}) {
  const ids = useMemo(() => roots.map((r) => r.id), [roots]);

  return (
    <div className="tree">
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {roots.map((n) => (
          <TaskRow
            key={n.id}
            node={n}
            depth={0}
            editingId={editingId}
            setEditingId={setEditingId}
            onAddChild={onAddChild}
            onDelete={onDelete}
            onRename={onRename}
            onToggleCheck={onToggleCheck}
            onToggleCollapse={onToggleCollapse}
            onRequestQuickAddUnder={onRequestQuickAddUnder}
            searchQuery={searchQuery}
            showHandles={true}
          />
        ))}
      </SortableContext>
    </div>
  );
}
