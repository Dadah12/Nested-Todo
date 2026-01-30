import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Tabs from "./components/Tabs";
import SearchBar from "./components/SearchBar";
import ProgressBar from "./components/ProgressBar";
import TaskTree from "./components/TaskTree";
import EmptyState from "./components/EmptyState";
import Footer from "./components/Footer";
import QuickAddModal from "./components/QuickAddModal";
import { ToastProvider, useToast } from "./components/Toast";
import type { TodoNode } from "./types";
import {
  buildParentMap,
  filterByQuery,
  insertChild,
  insertRoot,
  isDoneGroup,
  rename,
  deleteById,
  toggleCheck,
  toggleCollapse,
  setCollapseAll,
  countProgressForest,
  reorderSiblings,
  parseIndented,
} from "./lib/tree";
import { clearAll, loadHeart, loadTree, saveHeart, saveTree } from "./lib/storage";
import { exportCSV, exportPrintable } from "./lib/exporters";
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { motion } from "framer-motion";
import { Download, FileText, Plus, Trash2, ChevronDown, ChevronUp, ClipboardPaste } from "lucide-react";

type Tab = "todo" | "done";

function AppInner() {
  const toast = useToast();

  const [roots, setRoots] = useState<TodoNode[]>(() => loadTree());
  const [tab, setTab] = useState<Tab>("todo");
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const newInputRef = useRef<HTMLInputElement | null>(null);

  const [heartOn, setHeartOn] = useState<boolean>(() => loadHeart());

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddUnder, setQuickAddUnder] = useState<string | null>(null);

  // Auto-save (debounced)
  useEffect(() => {
    const t = window.setTimeout(() => saveTree(roots), 200);
    return () => window.clearTimeout(t);
  }, [roots]);

  useEffect(() => saveHeart(heartOn), [heartOn]);

  // Sensors tuned for mobile (small drag threshold so taps still tap)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const parentMap = useMemo(() => buildParentMap(roots), [roots]);

  const todoRoots = useMemo(() => roots.filter((r) => !isDoneGroup(r)), [roots]);
  const doneRoots = useMemo(() => roots.filter((r) => isDoneGroup(r)), [roots]);

  const baseList = tab === "todo" ? todoRoots : doneRoots;
  const filteredList = useMemo(() => filterByQuery(baseList, query), [baseList, query]);

  const globalProg = useMemo(() => countProgressForest(roots), [roots]);
  const listProg = useMemo(() => countProgressForest(baseList), [baseList]);

  const onAddRoot = useCallback(() => {
    const t = newTitle.trim();
    if (!t) return;
    setRoots((r) => insertRoot(r, t));
    setNewTitle("");
    toast.push("Added");
    newInputRef.current?.focus();
  }, [newTitle, toast]);

  const onAddChild = useCallback(
    (parentId: string) => {
      const title = prompt("Subtask title?");
      if (!title) return;
      setRoots((r) => insertChild(r, parentId, title));
      toast.push("Added subtask");
    },
    [toast]
  );

  const onQuickAddUnder = useCallback((parentId: string) => {
    setQuickAddUnder(parentId);
    setQuickAddOpen(true);
  }, []);

  const onQuickAddRoots = useCallback((nodes: TodoNode[]) => {
    if (!nodes.length) return;
    setRoots((r) => [...r, ...nodes]);
    toast.push("Quick add imported");
  }, [toast]);

  const onQuickAddUnderCommit = useCallback((nodes: TodoNode[]) => {
    if (!nodes.length || !quickAddUnder) return;
    // merge as children under the selected node
    setRoots((r) => {
      // reuse insertChild in batch: updateById would be better; simplest: parse then attach
      const attach = (arr: TodoNode[]): TodoNode[] => {
        return arr.map((n) => {
          if (n.id === quickAddUnder) {
            return { ...n, collapsed: false, children: [...n.children, ...nodes] };
          }
          if (!n.children.length) return n;
          return { ...n, children: attach(n.children) };
        });
      };
      return attach(r);
    });
    toast.push("Quick add (under) imported");
  }, [quickAddUnder, toast]);

  const onDelete = useCallback(
    (id: string) => {
      const ok = confirm("Delete this item and all its subtasks?");
      if (!ok) return;
      setRoots((r) => deleteById(r, id));
      toast.push("Deleted");
    },
    [toast]
  );

  const onRename = useCallback(
    (id: string, title: string) => {
      setRoots((r) => rename(r, id, title));
      toast.push("Saved");
    },
    [toast]
  );

  const onToggleCheck = useCallback((id: string) => {
    setRoots((r) => toggleCheck(r, id));
  }, []);

  const onToggleCollapse = useCallback((id: string) => {
    setRoots((r) => toggleCollapse(r, id));
  }, []);

  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const onDragEnd = useCallback(
    (e: DragEndEvent) => {
      const { active, over } = e;
      setActiveDragId(null);
      if (!over || active.id === over.id) return;

      const a = String(active.id);
      const o = String(over.id);

      const pa = parentMap.get(a);
      const po = parentMap.get(o);

      // siblings only: same parent
      if (pa !== po) return;

      // Premium rule: only reorder inside current view list for roots.
      // For nested, always allowed (siblings only).
      // For roots in Done tab, we keep them stable (no reorder) to avoid confusion.
      if (pa === null && tab === "done") return;

      setRoots((r) => reorderSiblings(r, pa ?? null, a, o));
      toast.push("Reordered");
    },
    [parentMap, tab, toast]
  );

  const showHandles = tab === "todo"; // allow dragging in Todo list (roots + nested). Done is view-only.
  const expandAll = useCallback(() => setRoots((r) => setCollapseAll(r, false)), []);
  const collapseAll = useCallback(() => setRoots((r) => setCollapseAll(r, true)), []);

  const onExportCSV = useCallback(() => {
    exportCSV(roots);
    toast.push("Exported CSV");
  }, [roots, toast]);

  const onExportPDF = useCallback(() => {
    exportPrintable(roots);
    toast.push("Opened print view");
  }, [roots, toast]);

  const onReset = useCallback(() => {
    const ok = confirm("Reset all data? Tip: Export first to keep a backup.");
    if (!ok) return;
    clearAll();
    setRoots([]);
    setQuery("");
    toast.push("Reset complete");
  }, [toast]);

  // Keyboard shortcuts: Enter add, Escape cancel editing
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setEditingId(null);
        setQuickAddOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onNewKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") onAddRoot();
    if (e.key === "Escape") setNewTitle("");
  };

  const emptyKind = tab;

  return (
    <div className="page">
      <header className="top">
        <div className="brand">
          <div className="logo">✓</div>
          <div className="brandText">
            <div className="brandName">Nested Todo</div>
            <div className="brandSub">Mobile-first • Offline • Infinite nesting</div>
          </div>
        </div>

        <div className="controls">
          <SearchBar value={query} onChange={setQuery} onClear={() => setQuery("")} />
          <Tabs tab={tab} onTab={setTab} todoCount={todoRoots.length} doneCount={doneRoots.length} />
        </div>
      </header>

      <main className="card">
        <div className="addRow">
          <input
            ref={newInputRef}
            className="addInput"
            placeholder="Add a task… (Enter)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={onNewKey}
          />
          <motion.button className="btn" whileTap={{ scale: 0.96 }} onClick={onAddRoot} aria-label="Add task">
            <Plus size={18} />
            Add
          </motion.button>
          <motion.button className="btn ghostBtn" whileTap={{ scale: 0.96 }} onClick={() => { setQuickAddUnder(null); setQuickAddOpen(true); }}>
            <ClipboardPaste size={18} />
            Quick Add
          </motion.button>
        </div>

        <div className="barRow">
          <ProgressBar done={listProg.done} total={listProg.total} label={tab === "todo" ? "This list" : "Done groups"} />
        </div>

        <div className="toolbar">
          <div className="toolLeft">
            <button className="chip" onClick={expandAll} title="Expand all">
              <ChevronDown size={16} /> Expand all
            </button>
            <button className="chip" onClick={collapseAll} title="Collapse all">
              <ChevronUp size={16} /> Collapse all
            </button>
          </div>
          <div className="toolRight">
            <button className="chip" onClick={onExportCSV} title="Export CSV">
              <Download size={16} /> CSV
            </button>
            <button className="chip" onClick={onExportPDF} title="Print / Save as PDF">
              <FileText size={16} /> PDF
            </button>
            <button className="chip dangerChip" onClick={onReset} title="Reset data">
              <Trash2 size={16} /> Reset
            </button>
          </div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={(e) => setActiveDragId(String(e.active.id))}
          onDragEnd={onDragEnd}
          onDragCancel={() => setActiveDragId(null)}
        >
          {filteredList.length ? (
            <TaskTree
              roots={filteredList}
              editingId={editingId}
              setEditingId={setEditingId}
              onAddChild={onAddChild}
              onDelete={onDelete}
              onRename={onRename}
              onToggleCheck={onToggleCheck}
              onToggleCollapse={onToggleCollapse}
              onRequestQuickAddUnder={onQuickAddUnder}
              searchQuery={query}
              showHandles={showHandles}
            />
          ) : (
            <EmptyState kind={emptyKind} />
          )}

          <DragOverlay>
            {activeDragId ? (
              <div className="dragOverlayCard">Moving…</div>
            ) : null}
          </DragOverlay>
        </DndContext>

        <div className="barRow">
          <ProgressBar done={globalProg.done} total={globalProg.total} label="All tasks" />
        </div>
      </main>

      <Footer
        heartOn={heartOn}
        toggleHeart={() => setHeartOn((v) => !v)}
      />

      <QuickAddModal
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onAdd={(nodes) => {
          if (quickAddUnder) onQuickAddUnderCommit(nodes);
          else onQuickAddRoots(nodes);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}
