import React, { useMemo, useState } from "react";
import type { TodoNode } from "../types";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { flattenTree, getVisibleItems, reorderTreeByDnD, type FlatItem } from "../lib/sortableTree";
import { ChevronDown, ChevronRight, GripVertical, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";

type Props = {
  roots: TodoNode[];
  viewRoots: TodoNode[];
  setRoots: React.Dispatch<React.SetStateAction<TodoNode[]>>;

  editingId: string | null;
  setEditingId: (id: string | null) => void;

  onAddChild: (parentId: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onToggleCheck: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  onRequestQuickAddUnder: (parentId: string) => void;

  searchQuery: string;
  showHandles: boolean;
};

function Row({
  item,
  dragEnabled,
  isEditing,
  draftTitle,
  setDraftTitle,
  startEdit,
  commitEdit,
  cancelEdit,
  onAddChild,
  onDelete,
  onToggleCheck,
  onToggleCollapse,
  onRequestQuickAddUnder,
}: {
  item: FlatItem;
  dragEnabled: boolean;

  isEditing: boolean;
  draftTitle: string;
  setDraftTitle: (v: string) => void;
  startEdit: () => void;
  commitEdit: () => void;
  cancelEdit: () => void;

  onAddChild: () => void;
  onDelete: () => void;
  onToggleCheck: () => void;
  onToggleCollapse: () => void;
  onRequestQuickAddUnder: () => void;
}) {
  const hasKids = (item.children?.length ?? 0) > 0;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !dragEnabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
    ["--vdepth" as any]: item.depth,
  } as React.CSSProperties;

  return (
    <div ref={setNodeRef} style={style} className="rowDnDWrap">
      <div className={`row ${item.checked ? "done" : ""}`} {...attributes}>
        <div className="rowInner">
          <button
            className="twisty"
            onClick={hasKids ? onToggleCollapse : undefined}
            aria-label={hasKids ? (item.collapsed ? "Expand" : "Collapse") : "No children"}
            title={hasKids ? (item.collapsed ? "Expand" : "Collapse") : ""}
            disabled={!hasKids}
            type="button"
          >
            {hasKids ? (item.collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />) : <span className="twistyGhost" />}
          </button>

          <label className="checkWrap" aria-label="Toggle done">
            <input className="checkInput" type="checkbox" checked={!!item.checked} onChange={onToggleCheck} />
            <span className="checkBox" aria-hidden="true" />
          </label>

          <button
            className={`dragHandle ${dragEnabled ? "" : "disabled"}`}
            type="button"
            aria-label={dragEnabled ? "Drag to reorder" : "Reorder disabled"}
            title={dragEnabled ? "Drag to reorder (slide right/left to indent/outdent)" : "Reorder disabled"}
            {...(dragEnabled ? listeners : {})}
          >
            <GripVertical size={16} />
          </button>

          <div className="titleWrap">
            {isEditing ? (
              <input
                className="editInput"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitEdit();
                  if (e.key === "Escape") cancelEdit();
                }}
                onBlur={commitEdit}
                autoFocus
              />
            ) : (
              <button className="titleBtn" type="button" onDoubleClick={startEdit} title="Double click to rename">
                {item.title}
              </button>
            )}
          </div>

          <details className="actionsKebab">
            <summary className="kebabBtn" aria-label="Actions" title="Actions">
              <MoreHorizontal size={18} />
            </summary>
            <div className="kebabMenu" role="menu">
              <button className="kebabItem" type="button" onClick={onAddChild}>
                <Plus size={16} /> Add subtask
              </button>
              <button className="kebabItem" type="button" onClick={onRequestQuickAddUnder}>
                <Plus size={16} /> Quick add under
              </button>
              <button className="kebabItem" type="button" onClick={startEdit}>
                <Pencil size={16} /> Rename
              </button>
              <button className="kebabItem danger" type="button" onClick={onDelete}>
                <Trash2 size={16} /> Delete
              </button>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

export default function TaskListDnD({
  roots,
  viewRoots,
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
  showHandles,
}: Props) {
  const flatAll = useMemo(() => flattenTree(viewRoots), [viewRoots]);
  const visible = useMemo(() => getVisibleItems(flatAll), [flatAll]);

  // English comment: disable reorder while searching (avoids confusing moves).
  const dragEnabled = showHandles && searchQuery.trim() === "";

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const [activeId, setActiveId] = useState<string | null>(null);
  const activeItem = useMemo(
    () => (activeId ? visible.find((x) => x.id === activeId) ?? null : null),
    [activeId, visible]
  );

  const [draftTitle, setDraftTitle] = useState("");

  const startEdit = (id: string, currentTitle: string) => {
    setEditingId(id);
    setDraftTitle(currentTitle);
  };

  const commitEdit = () => {
    if (!editingId) return;
    const next = draftTitle.trim();
    if (next) onRename(editingId, next);
    setEditingId(null);
    setDraftTitle("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraftTitle("");
  };

  const onDragStart = (e: DragStartEvent) => {
    if (!dragEnabled) return;
    setActiveId(String(e.active.id));
  };

  const onDragEnd = (e: DragEndEvent) => {
    if (!dragEnabled) {
      setActiveId(null);
      return;
    }
    const a = String(e.active.id);
    const o = e.over?.id ? String(e.over.id) : "";
    setActiveId(null);
    if (!a || !o || a === o) return;

    setRoots((prev) =>
      reorderTreeByDnD({
        roots: prev,
        activeId: a,
        overId: o,
        offsetX: e.delta.x,
      })
    );
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext items={visible.map((x) => x.id)} strategy={verticalListSortingStrategy}>
        <div className="tree">
          {visible.map((item) => (
            <Row
              key={item.id}
              item={item}
              dragEnabled={dragEnabled}
              isEditing={editingId === item.id}
              draftTitle={editingId === item.id ? draftTitle : item.title}
              setDraftTitle={setDraftTitle}
              startEdit={() => startEdit(item.id, item.title)}
              commitEdit={commitEdit}
              cancelEdit={cancelEdit}
              onAddChild={() => onAddChild(item.id)}
              onDelete={() => onDelete(item.id)}
              onToggleCheck={() => onToggleCheck(item.id)}
              onToggleCollapse={() => onToggleCollapse(item.id)}
              onRequestQuickAddUnder={() => onRequestQuickAddUnder(item.id)}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay>{activeItem ? <div className="dragOverlayCard">{activeItem.title}</div> : null}</DragOverlay>
    </DndContext>
  );
}
