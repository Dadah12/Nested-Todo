import React, { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import type { TodoNode } from "../types";
import { countProgress, isComplete, isDoneGroup, isIndeterminate, hasChildren } from "../lib/tree";
import { motion, AnimatePresence } from "framer-motion";
import Checkbox from "./Checkbox";
import { ChevronRight, ChevronDown, Plus, Trash2, Pencil, GripVertical, ClipboardPlus } from "lucide-react";
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

  useEffect(() => setDraft(node.title), [node.title]);
  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const complete = isComplete(node);
  const ind = isIndeterminate(node);
  const hasKids = hasChildren(node);
  const doneGroup = isDoneGroup(node);

  const prog = useMemo(() => countProgress(node), [node]);

  // Cap indent so super deep doesn't go off-screen on mobile
  const indent = Math.min(depth, 6) * 12;

  // DnD sortable row
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
    disabled: !showHandles,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
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

  return (
    <div ref={setNodeRef} style={style} className={`row ${doneGroup ? "doneGroup" : ""}`} data-depth={depth}>
      <div className="rowInner" style={{ paddingLeft: 10 + indent }}>
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

          {showHandles ? (
            <button className="iconBtn ghost dragHandle" {...attributes} {...listeners} aria-label="Drag">
              <GripVertical size={18} />
            </button>
          ) : null}

          {!isEditing ? (
            <button
              className={`titleBtn ${complete ? "strike" : ""}`}
              onClick={() => setEditingId(node.id)}
              aria-label="Edit title"
            >
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
            />
          )}
        </div>

        <div className="actions">
          <motion.button
            className="iconBtn"
            whileTap={{ scale: 0.95 }}
            onClick={() => onAddChild(node.id)}
            aria-label="Add subtask"
            title="Add subtask"
          >
            <Plus size={18} />
          </motion.button>

          <motion.button
            className="iconBtn"
            whileTap={{ scale: 0.95 }}
            onClick={() => onRequestQuickAddUnder(node.id)}
            aria-label="Quick add under"
            title="Quick add under"
          >
            <ClipboardPlus size={18} />
          </motion.button>

          <motion.button className="iconBtn" whileTap={{ scale: 0.95 }} onClick={() => setEditingId(node.id)} aria-label="Rename" title="Rename">
            <Pencil size={18} />
          </motion.button>

          <motion.button
            className="iconBtn danger"
            whileTap={{ scale: 0.95 }}
            onClick={() => onDelete(node.id)}
            aria-label="Delete"
            title="Delete"
          >
            <Trash2 size={18} />
          </motion.button>
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
