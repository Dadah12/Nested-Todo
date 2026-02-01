import React, { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import type { TodoNode } from "../types";
import { countProgress, isComplete, isDoneGroup, isIndeterminate, hasChildren } from "../lib/tree";
import { motion, AnimatePresence } from "framer-motion";
import Checkbox from "./Checkbox";
import { ChevronRight, ChevronDown, Plus, Trash2, Pencil, GripVertical, ClipboardPlus, MoreHorizontal } from "lucide-react";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function TaskRowBase({
  node,
  depth,
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
}: {
  node: TodoNode;
  depth: number;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onToggleCheck: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  onRequestQuickAddUnder: (id: string) => void;
  searchQuery: string;
  showHandles: boolean;
}) {
  const isEditing = editingId === node.id;

  const [draft, setDraft] = useState(node.title);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Premium UX: one clean entry point for actions (kebab menu) on ALL screens.
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setDraft(node.title), [node.title]);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  useEffect(() => {
    if (!menuOpen) return;

    // Close menu on outside click/tap.
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (!menuRef.current) return;
      if (t && !menuRef.current.contains(t)) setMenuOpen(false);
    };

    // Close menu via Escape.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };

    window.addEventListener("pointerdown", onPointerDown, { capture: true });
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("pointerdown", onPointerDown, { capture: true } as any);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const complete = isComplete(node);
  const ind = isIndeterminate(node);
  const hasKids = hasChildren(node);
  const doneGroup = isDoneGroup(node);

  const prog = useMemo(() => countProgress(node), [node]);

  // Clamp indentation so mobile stays readable.
  const vdepth = Math.min(depth, 3);

  // Drag & drop: always enabled (we pass showHandles=true from TaskTree).
  const dragEnabled = true;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
    disabled: !dragEnabled,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    ["--depth" as any]: depth,
    ["--vdepth" as any]: vdepth,
  };

  const highlight = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return { pre: node.title, hit: "", post: "" };

    const t = node.title;
    const idx = t.toLowerCase().indexOf(q);
    if (idx === -1) return { pre: t, hit: "", post: "" };

    return { pre: t.slice(0, idx), hit: t.slice(idx, idx + q.length), post: t.slice(idx + q.length) };
  }, [node.title, searchQuery]);

  const commit = useCallback(() => {
    setEditingId(null);
    const next = draft.trim();
    if (next && next !== node.title) onRename(node.id, next);
    else setDraft(node.title);
  }, [draft, node.id, node.title, onRename, setEditingId]);

  const childIds = useMemo(() => node.children.map((c) => c.id), [node.children]);

  const closeMenuThen = useCallback((fn: () => void) => {
    setMenuOpen(false);
    fn();
  }, []);

  return (
    <div ref={setNodeRef} style={style} className={`row ${doneGroup ? "doneGroup" : ""}`} data-depth={depth}>
      <div className="rowInner">
        <div className="leftBits">
          {hasKids ? (
            <button className="iconBtn ghost" onClick={() => onToggleCollapse(node.id)} aria-label="Collapse/expand">
              {node.collapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
            </button>
          ) : (
            <div className="spacerIcon" aria-hidden />
          )}

          <Checkbox
            checked={complete}
            indeterminate={ind}
            onChange={() => onToggleCheck(node.id)}
            ariaLabel={hasKids ? "Toggle all children" : "Toggle task"}
          />

          {/* Drag handle is visible (mobile + desktop) for real drag & drop UX. */}
          <button className="iconBtn ghost dragHandle" {...attributes} {...listeners} aria-label="Drag" title="Drag to reorder">
            <GripVertical size={18} />
          </button>

          {!isEditing ? (
            <button className={`titleBtn ${complete ? "strike" : ""}`} onClick={() => setEditingId(node.id)} aria-label="Edit title">
              <span className="titleText">
                {highlight.hit ? (
                  <>
                    {highlight.pre}
                    <mark className="mark">{highlight.hit}</mark>
                    {highlight.post}
                  </>
                ) : (
                  node.title
                )}
              </span>

              {hasKids ? <span className="miniMeta">{prog.done}/{prog.total}</span> : null}
            </button>
          ) : (
            <input
              ref={inputRef}
              className="titleInput"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") {
                  setDraft(node.title);
                  setEditingId(null);
                }
              }}
              aria-label="Edit task title"
            />
          )}
        </div>

        {/* Kebab menu only (no action cluster). Keeps UI premium + not cramped. */}
        <div className="actionsKebab" ref={menuRef} aria-label="Task actions">
          <button
            className={`iconBtn ghost kebabBtn ${menuOpen ? "active" : ""}`}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="More actions"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            title="More"
          >
            <MoreHorizontal size={18} />
          </button>

          <AnimatePresence initial={false}>
            {menuOpen ? (
              <motion.div
                className="menuPanel"
                role="menu"
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.12 }}
              >
                <button className="menuItem" role="menuitem" onClick={() => closeMenuThen(() => onAddChild(node.id))}>
                  <Plus size={16} />
                  <span>Add subtask</span>
                </button>

                <button className="menuItem" role="menuitem" onClick={() => closeMenuThen(() => onRequestQuickAddUnder(node.id))}>
                  <ClipboardPlus size={16} />
                  <span>Quick add</span>
                </button>

                <button className="menuItem" role="menuitem" onClick={() => closeMenuThen(() => setEditingId(node.id))}>
                  <Pencil size={16} />
                  <span>Rename</span>
                </button>

                <div className="menuDivider" />

                <button className="menuItem danger" role="menuitem" onClick={() => closeMenuThen(() => onDelete(node.id))}>
                  <Trash2 size={16} />
                  <span>Delete</span>
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {!node.collapsed && node.children.length ? (
          <motion.div
            className="children"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.16 }}
          >
            <div className="childrenInner">
              <SortableContext items={childIds} strategy={verticalListSortingStrategy}>
                {node.children.map((c) => (
                  <MemoRow
                    key={c.id}
                    node={c}
                    depth={depth + 1}
                    editingId={editingId}
                    setEditingId={setEditingId}
                    onAddChild={onAddChild}
                    onDelete={onDelete}
                    onRename={onRename}
                    onToggleCheck={onToggleCheck}
                    onToggleCollapse={onToggleCollapse}
                    onRequestQuickAddUnder={onRequestQuickAddUnder}
                    searchQuery={searchQuery}
                    showHandles={showHandles}
                  />
                ))}
              </SortableContext>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

const MemoRow = memo(TaskRowBase);
export default MemoRow;
