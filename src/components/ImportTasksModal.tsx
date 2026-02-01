import React, { useMemo, useState } from "react";
import type { TodoNode } from "../types";

type Mode = "merge" | "replace";

function makeId() {
  // English comment: crypto.randomUUID is best, fallback for older browsers.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return (crypto as any).randomUUID();
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function buildTreeFromOutline(text: string): TodoNode[] {
  // English comment: Supports tab-indented or 2-space indented outlines.
  const lines = text
    .split("\n")
    .map((l) => l.replace(/\r/g, ""))
    .filter((l) => l.trim().length);

  const roots: TodoNode[] = [];
  const stack: { depth: number; node: TodoNode }[] = [];

  for (const raw of lines) {
    const leadingTabs = raw.match(/^\t+/)?.[0]?.length ?? 0;

    // Treat 2 spaces as one depth level as well
    const leadingSpaces = raw.match(/^\s+/)?.[0]?.length ?? 0;
    const spaceDepth = Math.floor(leadingSpaces / 2);

    const depth = Math.max(leadingTabs, spaceDepth);
    const title = raw.trim();

    const node: TodoNode = {
      id: makeId(),
      title,
      checked: false,
      collapsed: false,
      children: [],
    } as any;

    while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop();

    if (!stack.length) {
      roots.push(node);
    } else {
      stack[stack.length - 1].node.children.push(node);
    }

    stack.push({ depth, node });
  }

  return roots;
}

export default function ImportTasksModal({
  open,
  onClose,
  onImport,
}: {
  open: boolean;
  onClose: () => void;
  onImport: (nodes: TodoNode[], mode: Mode) => void;
}) {
  const [mode, setMode] = useState<Mode>("merge");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const previewCount = useMemo(() => {
    if (!text.trim()) return 0;
    return text.split("\n").filter((l) => l.trim().length).length;
  }, [text]);

  if (!open) return null;

  return (
    <div className="modalOverlay" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modalHeader">
          <div className="modalTitle">Import Tasks</div>
          <button className="iconBtn ghost" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modalBody">
          <div className="stack">
            <div className="rowWrap">
              <div className="label">Mode</div>
              <select className="select" value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
                <option value="merge">Merge (append)</option>
                <option value="replace">Replace (overwrite)</option>
              </select>
              <div className="muted">Preview lines: {previewCount}</div>
            </div>

            <div className="hint">
              Paste an outline. Use tabs or 2-spaces indentation for nesting:
              <br />
              <span className="muted">
                Main task
                <br />
                {"\t"}Subtask
                <br />
                {"\t\t"}Sub-subtask
              </span>
            </div>

            <textarea
              className="textarea"
              rows={10}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setError(null);
              }}
              placeholder={`Example:\nProject A\n\tSetup repo\n\tBuild UI\nProject B\n\tTesting`}
            />

            {error ? <div className="toast">{error}</div> : null}

            <div className="rowBetween">
              <button
                className="btn ghostBtn"
                onClick={() => {
                  setText("");
                  setError(null);
                }}
              >
                Clear
              </button>

              <button
                className="btn"
                onClick={() => {
                  try {
                    const nodes = buildTreeFromOutline(text);
                    if (!nodes.length) {
                      setError("No tasks found. Paste at least one line.");
                      return;
                    }
                    onImport(nodes, mode);
                    onClose();
                  } catch (e: any) {
                    setError(e?.message || "Import failed.");
                  }
                }}
              >
                Import
              </button>
            </div>

            <div className="muted">
              Tip: You can save your outline in notes and paste it anytime to organize big projects.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
