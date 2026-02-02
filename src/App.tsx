import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ClipboardPaste, Download, FileText, Trash2, Upload } from "lucide-react";

import type { TodoNode } from "./types";

import SearchBar from "./components/SearchBar";
import Tabs from "./components/Tabs";
import ProgressBar from "./components/ProgressBar";
import EmptyState from "./components/EmptyState";
import QuickAddModal from "./components/QuickAddModal";
import ImportTasksModal from "./components/ImportTasksModal";
import Footer from "./components/Footer";
import TaskListDnD from "./components/TaskListDnD";
import { ToastProvider, useToast } from "./components/Toast";

import { loadState, saveState } from "./lib/storage";
import { DEFAULT_TEMPLATE } from "./lib/templates";
import {
  addChild,
  addRoot,
  collapseAll,
  countByChecked,
  deleteNode,
  expandAll,
  filterByQuery,
  filterByTab,
  getProgress,
  insertManyRoots,
  renameNode,
  toggleCheck,
  toggleCollapse,
  upsertUnderParent,
} from "./lib/tree";
import { exportCSV, exportPDFViaPrint } from "./lib/exporters";

function AppInner() {
  const toast = useToast();

  const [roots, setRoots] = useState<TodoNode[]>(() => {
    const s = loadState();
    return s?.roots?.length ? s.roots : DEFAULT_TEMPLATE;
  });

  const [tab, setTab] = useState<"todo" | "done">("todo");
  const [query, setQuery] = useState("");

  const [newTitle, setNewTitle] = useState("");
  const newInputRef = useRef<HTMLInputElement | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddUnder, setQuickAddUnder] = useState<string | null>(null);

  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    saveState({ roots });
  }, [roots]);

  const tabFiltered = useMemo(() => filterByTab(roots, tab), [roots, tab]);
  const viewRoots = useMemo(() => filterByQuery(tabFiltered, query), [tabFiltered, query]);

  const progView = useMemo(() => getProgress(tabFiltered), [tabFiltered]);
  const progAll = useMemo(() => getProgress(roots), [roots]);

  const counts = useMemo(() => countByChecked(roots), [roots]);

  // Premium: reorder only when Todo tab + no search
  const showHandles = tab === "todo" && query.trim() === "";

  const onAddRoot = () => {
    const title = newTitle.trim();
    if (!title) return;
    setRoots((prev) => addRoot(prev, title));
    setNewTitle("");
    requestAnimationFrame(() => newInputRef.current?.focus());
  };

  const onAddChild = (parentId: string) => {
    const title = prompt("Subtask title")?.trim();
    if (!title) return;
    setRoots((prev) => addChild(prev, parentId, title));
  };

  const onDelete = (id: string) => {
    if (!confirm("Delete this task?")) return;
    setRoots((prev) => deleteNode(prev, id));
    toast.success("Deleted.");
  };

  const onRename = (id: string, title: string) => {
    setRoots((prev) => renameNode(prev, id, title));
  };

  const onToggleCheck = (id: string) => {
    setRoots((prev) => toggleCheck(prev, id));
  };

  const onToggleCollapse = (id: string) => {
    setRoots((prev) => toggleCollapse(prev, id));
  };

  const expandAllNow = () => setRoots((prev) => expandAll(prev));
  const collapseAllNow = () => setRoots((prev) => collapseAll(prev));

  const onRequestQuickAddUnder = (parentId: string) => {
    setQuickAddUnder(parentId);
    setQuickAddOpen(true);
  };

  const onQuickAddCommit = (nodes: TodoNode[]) => {
    if (quickAddUnder) setRoots((prev) => upsertUnderParent(prev, quickAddUnder, nodes));
    else setRoots((prev) => insertManyRoots(prev, nodes));

    setQuickAddUnder(null);
    setQuickAddOpen(false);
    toast.success("Added.");
  };

  const onExportCSV = () => {
    try {
      exportCSV(roots);
      toast.success("Exported CSV.");
    } catch {
      toast.error("CSV export failed.");
    }
  };

  const onExportPDF = () => {
    try {
      exportPDFViaPrint(roots);
      toast.success("Use Print → Save as PDF.");
    } catch {
      toast.error("PDF export failed.");
    }
  };

  const onReset = () => {
    if (!confirm("Reset all tasks? This cannot be undone.")) return;
    setRoots(DEFAULT_TEMPLATE);
    toast.success("Reset done.");
  };

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
          <Tabs tab={tab} onTab={setTab} todoCount={counts.todo} doneCount={counts.done} />
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
            onKeyDown={(e) => {
              if (e.key === "Enter") onAddRoot();
              if (e.key === "Escape") setNewTitle("");
            }}
          />

          <motion.button
            className="btn"
            whileTap={{ scale: 0.96 }}
            onClick={() => setImportOpen(true)}
            aria-label="Upload / Import tasks"
            title="Upload / Import tasks"
          >
            <Upload size={18} />
            Upload
          </motion.button>

          <motion.button
            className="btn ghostBtn"
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              setQuickAddUnder(null);
              setQuickAddOpen(true);
            }}
            aria-label="Quick add"
            title="Quick add"
          >
            <ClipboardPaste size={18} />
            Quick Add
          </motion.button>
        </div>

        <div className="barRow">
          <ProgressBar done={progView.done} total={progView.total} label={tab === "todo" ? "This list" : "Done view"} />
        </div>

        <div className="toolbar">
          <div className="toolLeft">
            <button className="chip" onClick={expandAllNow} title="Expand all">
              Expand all
            </button>
            <button className="chip" onClick={collapseAllNow} title="Collapse all">
              Collapse all
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

        {viewRoots.length ? (
          <TaskListDnD
            roots={roots}
            viewRoots={viewRoots}
            setRoots={setRoots}
            editingId={editingId}
            setEditingId={setEditingId}
            onAddChild={onAddChild}
            onDelete={onDelete}
            onRename={onRename}
            onToggleCheck={onToggleCheck}
            onToggleCollapse={onToggleCollapse}
            onRequestQuickAddUnder={onRequestQuickAddUnder}
            searchQuery={query}
            showHandles={showHandles}
          />
        ) : (
          <EmptyState kind={tab} />
        )}

        <div className="barRow">
          <ProgressBar done={progAll.done} total={progAll.total} label="All tasks" />
        </div>
      </main>

      <Footer />

      <QuickAddModal open={quickAddOpen} onClose={() => setQuickAddOpen(false)} onAdd={onQuickAddCommit} />

      <ImportTasksModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={(nodes, mode) => {
          if (mode === "replace") {
            setRoots(nodes);
            toast.success("Imported (replaced).");
            return;
          }
          setRoots((prev) => insertManyRoots(prev, nodes));
          toast.success("Imported (merged).");
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
