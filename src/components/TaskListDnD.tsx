import React, { useMemo, useState } from "react";
import type { TodoNode } from "../types";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

import TaskRow from "./TaskRow";
import { flattenTree, getVisibleItems, reorderTreeByDnD } from "../lib/sortableTree";

export default function TaskListDnD({
  roots,
  setRoots,

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
  setRoots: (next: TodoNode[]) => void;

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
  const [activeId, setActiveId] = useState<string | null>(null);
  const [offsetX, setOffsetX] = useState(0);

  const flatAll = useMemo(() => flattenTree(roots), [roots]);
  const visible = useMemo(() => getVisibleItems(flatAll), [flatAll]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // English comment: Prevent accidental drags while scrolling.
      activationConstraint: { distance: 6 },
    })
  );

  const activeItem = useMemo(() => {
    if (!activeId) return null;
    return (
      visible.find((x) => x.id === activeId) ||
      flatAll.find((x) => x.id === activeId) ||
      null
    );
  }, [activeId, visible, flatAll]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(e) => {
        setActiveId(String(e.active.id));
        setOffsetX(0);
      }}
      onDragMove={(e) => {
        setOffsetX(e.delta.x);
      }}
      onDragCancel={() => {
        setActiveId(null);
        setOffsetX(0);
      }}
      onDragEnd={(e) => {
        const active = String(e.active.id);
        const over = e.over?.id ? String(e.over.id) : null;

        setActiveId(null);
        setOffsetX(0);

        if (!over || active === over) return;

        const next = reorderTreeByDnD({
          roots,
          activeId: active,
          overId: over,
          offsetX,
        });

        setRoots(next);
      }}
    >
      <SortableContext
        items={visible.map((x) => x.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="tree">
          {visible.map((item) => (
            <TaskRow
              key={item.id}
              node={item}
              depth={item.depth}
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
        </div>
      </SortableContext>

      <DragOverlay>
        {activeItem ? (
          <div className="dragOverlayCard">{activeItem.title}</div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
