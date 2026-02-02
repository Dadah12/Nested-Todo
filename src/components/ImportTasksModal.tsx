import React, { useMemo, useRef, useState } from "react";
import type { TodoNode } from "../types";

type ImportMode = "merge" | "replace";

type Props = {
  open: boolean;
  onClose: () => void;
  onImport: (nodes: TodoNode[], mode: ImportMode) => void;
};

function makeId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(2, 7);
}

function parseBoolean(v: string | undefined) {
  const s = (v ?? "").trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "y";
}

function splitPath(raw: string) {
  const v = raw.trim();
  if (v.includes(">")) return v.split(">").map((x) => x.trim()).filter(Boolean);
  if (v.includes("|")) return v.split("|").map((x) => x.trim()).filter(Boolean);
  if (v.includes("/")) return v.split("/").map((x) => x.trim()).filter(Boolean);
  return [v];
}

function parseCSVLine(line: string): string[] {
  // English comment: Tiny CSV parser (commas + quotes).
  const out: string[] = [];
  let cur = "";
  let inQ = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQ = !inQ;
      }
      continue;
    }
    if (ch === "," && !inQ) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function parseCSV(text: string): { header: string[]; rows: string[][] } {
  const lines = text.replace(/\r\n/g, "\n").split("\n").filter((l) => l.trim() !== "");
  if (!lines.length) return { header: [], rows: [] };
  const header = parseCSVLine(lines[0]).map((h) => h.trim());
  const rows = lines.slice(1).map(parseCSVLine);
  return { header, rows };
}

function buildTreeFromOutline(text: string): TodoNode[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const roots: TodoNode[] = [];
  const stack: { depth: number; node: TodoNode }[] = [];

  for (const raw of lines) {
    const line = raw.replace(/\t/g, "  ");
    const indent = line.match(/^\s*/)?.[0] ?? "";
    const depth = Math.floor(indent.length / 2);
    const title = line.trim();
    if (!title) continue;

    const node: TodoNode = { id: makeId(), title, checked: false, collapsed: false, children: [] };

    while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop();

    if (!stack.length) {
      roots.push(node);
      stack.push({ depth, node });
    } else {
      const parent = stack[stack.length - 1].node;
      parent.children.push(node);
      stack.push({ depth, node });
    }
  }

  return roots;
}

function buildTreeFromDepthCSV(header: string[], rows: string[][]): TodoNode[] {
  const h = header.map((x) => x.trim().toLowerCase());
  const iTitle = h.indexOf("title");
  const iDepth = h.indexOf("depth");
  const iChecked = h.indexOf("checked");
  const iCollapsed = h.indexOf("collapsed");

  const roots: TodoNode[] = [];
  const stack: { depth: number; node: TodoNode }[] = [];

  for (const r of rows) {
    const title = (r[iTitle] ?? "").trim();
    if (!title) continue;

    const depthRaw = (r[iDepth] ?? "0").trim();
    const depth = Number.isFinite(Number(depthRaw)) ? Math.max(0, Number(depthRaw)) : 0;

    const node: TodoNode = {
      id: makeId(),
      title,
      checked: parseBoolean(r[iChecked]),
      collapsed: parseBoolean(r[iCollapsed]),
      children: [],
    };

    while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop();

    if (!stack.length) {
      roots.push(node);
      stack.push({ depth, node });
    } else {
      const parent = stack[stack.length - 1].node;
      parent.children.push(node);
      stack.push({ depth, node });
    }
  }

  return roots;
}

function buildTreeFromPathCSV(header: string[], rows: string[][]): TodoNode[] {
  const h = header.map((x) => x.trim().toLowerCase());
  const iPath = h.indexOf("path");
  const iChecked = h.indexOf("checked");
  const iCollapsed = h.indexOf("collapsed");

  const roots: TodoNode[] = [];

  const getOrCreateChild = (parent: TodoNode | null, title: string) => {
    const list = parent ? parent.children : roots;
    const found = list.find((n) => n.title === title);
    if (found) return found;

    const node: TodoNode = { id: makeId(), title, checked: false, collapsed: false, children: [] };
    list.push(node);
    return node;
  };

  for (const r of rows) {
    const pathRaw = (r[iPath] ?? "").trim();
    if (!pathRaw) continue;

    const parts = splitPath(pathRaw);
    let parent: TodoNode | null = null;

    for (const p of parts) parent = getOrCreateChild(parent, p);

    if (parent) {
      parent.checked = parseBoolean(r[iChecked]);
      parent.collapsed = parseBoolean(r[iCollapsed]);
    }
  }

  return roots;
}

export default function ImportTasksModal({ open, onClose, onImport }: Props) {
  const [mode, setMode] = useState<ImportMode>("merge");
  const [tab, setTab] = useState<"csv" | "outline">("csv");

  const [outline, setOutline] = useState("");
  const [fileName, setFileName] = useState<string>("");
  const [fileText, setFileText] = useState<string>("");
  const [error, setError] = useState<string>("");

  const fileRef = useRef<HTMLInputElement | null>(null);

  const hint = useMemo(() => {
    return `Recommended CSV formats:

(1) Depth CSV:
title,depth,checked,collapsed
Project,0,false,false
Subtask,1,false,false

(2) Path CSV:
path,checked,collapsed
Home > Cleaning > Kitchen,false,false
Work / Sprint 12 / Bugfix,true,false
`;
  }, []);

  const parsed = useMemo(() => {
    if (!fileText) return { header: [], rows: [] as string[][] };
    return parseCSV(fileText);
  }, [fileText]);

  const onPickFile = async (f: File) => {
    setError("");
    setFileName(f.name);
    const text = await f.text();
    setFileText(text);
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    await onPickFile(f);
  };

  const doImport = () => {
    setError("");

    try {
      let nodes: TodoNode[] = [];

      if (tab === "outline") {
        if (!outline.trim()) {
          setError("Paste something first.");
          return;
        }
        nodes = buildTreeFromOutline(outline);
      } else {
        if (!fileText.trim()) {
          setError("Upload a CSV first.");
          return;
        }

        const { header, rows } = parsed;
        if (!header.length || !rows.length) {
          setError("CSV looks empty.");
          return;
        }

        const h = header.map((x) => x.trim().toLowerCase());
        if (h.includes("path")) nodes = buildTreeFromPathCSV(header, rows);
        else if (h.includes("depth") && h.includes("title")) nodes = buildTreeFromDepthCSV(header, rows);
        else {
          setError("CSV headers not recognized. Use either PATH or DEPTH format.");
          return;
        }
      }

      if (!nodes.length) {
        setError("No tasks found to import.");
        return;
      }

      onImport(nodes, mode);
      onClose();
      setOutline("");
      setFileName("");
      setFileText("");
    } catch (err: any) {
      setError(err?.message ?? "Import failed.");
    }
  };

  const downloadSample = () => {
    const sample =
      "title,depth,checked,collapsed\n" +
      "Cleaning,0,false,false\n" +
      "Bed,1,false,false\n" +
      "Pillow,2,false,false\n" +
      "Plate,1,true,false\n";

    const blob = new Blob([sample], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nested-todo-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!open) return null;

  return (
    <div className="modalOverlay" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <div className="modalPanel" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalHead">
          <div className="modalTitle">Upload / Import tasks</div>
          <button className="iconBtn" type="button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modalTabs">
          <button className={`tabBtn ${tab === "csv" ? "active" : ""}`} onClick={() => setTab("csv")} type="button">
            CSV Upload
          </button>
          <button className={`tabBtn ${tab === "outline" ? "active" : ""}`} onClick={() => setTab("outline")} type="button">
            Outline Paste
          </button>
        </div>

        <div className="modalBody">
          <div className="importMode">
            <span className="muted">Import mode:</span>
            <button className={`chip ${mode === "merge" ? "chipOn" : ""}`} type="button" onClick={() => setMode("merge")}>
              Merge
            </button>
            <button className={`chip ${mode === "replace" ? "chipOn" : ""}`} type="button" onClick={() => setMode("replace")}>
              Replace
            </button>
          </div>

          {tab === "csv" ? (
            <>
              <div
                className="fileDrop"
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                role="button"
                tabIndex={0}
              >
                <div className="fileDropTitle">{fileName ? fileName : "Drop a CSV here (or click to choose)"}</div>
                <div className="fileDropSub">Supports: PATH CSV or DEPTH CSV</div>
              </div>

              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                style={{ display: "none" }}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) await onPickFile(f);
                }}
              />

              <div className="hintBox">
                <div className="hintTop">
                  <div className="hintTitle">CSV format</div>
                  <button className="miniBtn" type="button" onClick={downloadSample}>
                    Download sample
                  </button>
                </div>
                <pre className="hintPre">{hint}</pre>
              </div>
            </>
          ) : (
            <textarea
              className="outlineBox"
              placeholder={`Paste outline here. Use 2 spaces for nesting:\n\nCleaning\n  Bed\n    Pillow\n  Plate`}
              value={outline}
              onChange={(e) => setOutline(e.target.value)}
            />
          )}

          {error ? <div className="errorBox">{error}</div> : null}
        </div>

        <div className="modalFoot">
          <button className="btn ghostBtn" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" type="button" onClick={doImport}>
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
