import React, { useMemo, useState } from "react";
import Modal from "./Modal";
import { parseIndented } from "../lib/tree";
import type { TodoNode } from "../types";
import { TEMPLATES } from "../lib/templates";

export default function QuickAddModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (roots: TodoNode[]) => void;
}) {
  const [text, setText] = useState("");

  const preview = useMemo(() => {
    try {
      return parseIndented(text);
    } catch {
      return [];
    }
  }, [text]);

  const total = useMemo(() => countNodes(preview), [preview]);

  return (
    <Modal open={open} onClose={onClose} title="Quick Add (paste with indentation)">
      <div className="stack">
        <div className="rowWrap">
          <label className="label">Templates</label>
          <select
            className="select"
            value=""
            onChange={(e) => {
              const name = e.target.value;
              const tpl = TEMPLATES.find((t) => t.name === name);
              if (tpl) setText(tpl.text);
            }}
          >
            <option value="" disabled>
              Choose…
            </option>
            {TEMPLATES.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <textarea
          className="textarea"
          placeholder={`Example:
Cleaning
  Bed
  Wall
    Paint`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
        />

        <div className="hint">
          Tip: 2 spaces (or 1 tab) = 1 nesting level. Lines like "- Task" also work.
        </div>

        <div className="rowBetween">
          <div className="muted">{total ? `${total} items ready` : "Nothing to add yet"}</div>
          <button
            className="btn"
            disabled={preview.length === 0}
            onClick={() => {
              onAdd(preview);
              setText("");
              onClose();
            }}
          >
            Add
          </button>
        </div>

        {preview.length ? (
          <div className="preview">
            <div className="label">Preview</div>
            <TreePreview roots={preview} />
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

function TreePreview({ roots }: { roots: TodoNode[] }) {
  return (
    <ul className="previewList">
      {roots.map((r) => (
        <PreviewNode key={r.id} node={r} />
      ))}
    </ul>
  );
}

function PreviewNode({ node }: { node: TodoNode }) {
  return (
    <li>
      <div className="previewItem">{node.title}</div>
      {node.children.length ? (
        <ul className="previewList">
          {node.children.map((c) => (
            <PreviewNode key={c.id} node={c} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function countNodes(roots: TodoNode[]): number {
  const walk = (n: TodoNode): number => 1 + n.children.reduce((s, c) => s + walk(c), 0);
  return roots.reduce((s, r) => s + walk(r), 0);
}
