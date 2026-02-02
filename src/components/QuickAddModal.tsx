import React, { useMemo, useState } from "react";
import type { TodoNode } from "../types";

function makeId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(2, 7);
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

export default function QuickAddModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (nodes: TodoNode[]) => void;
}) {
  const [text, setText] = useState("");
  const [err, setErr] = useState("");

  const hint = useMemo(
    () =>
      `Paste outline using 2 spaces per level:

Cleaning
  Bed
    Pillow
  Plate`,
    []
  );

  if (!open) return null;

  const submit = () => {
    setErr("");
    if (!text.trim()) {
      setErr("Paste something first.");
      return;
    }
    const nodes = buildTreeFromOutline(text);
    if (!nodes.length) {
      setErr("No tasks detected.");
      return;
    }
    onAdd(nodes);
    setText("");
    onClose();
  };

  return (
    <div className="modalOverlay" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <div className="modalPanel" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalHead">
          <div className="modalTitle">Quick Add</div>
          <button className="iconBtn" type="button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modalBody">
          <div className="hintBox">
            <div className="hintTitle">Format</div>
            <pre className="hintPre">{hint}</pre>
          </div>

          <textarea
            className="outlineBox"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste outline here…"
          />

          {err ? <div className="errorBox">{err}</div> : null}
        </div>

        <div className="modalFoot">
          <button className="btn ghostBtn" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" type="button" onClick={submit}>
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
