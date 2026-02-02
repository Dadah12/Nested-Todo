import type { TodoNode } from "../types";

function downloadText(filename: string, text: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

export function exportCSV(roots: TodoNode[]) {
  // English comment: Depth CSV is the simplest for re-import.
  const lines: string[] = [];
  lines.push("title,depth,checked,collapsed");

  const esc = (s: string) => {
    const v = s.replace(/"/g, '""');
    return `"${v}"`;
  };

  const walk = (n: TodoNode, depth: number) => {
    lines.push(
      [esc(n.title), String(depth), String(!!n.checked), String(!!n.collapsed)].join(",")
    );
    (n.children ?? []).forEach((c) => walk(c, depth + 1));
  };

  roots.forEach((r) => walk(r, 0));
  downloadText("nested-todo.csv", lines.join("\n"), "text/csv;charset=utf-8");
}

export function exportPrintableHTML(roots: TodoNode[]) {
  const rows: string[] = [];

  const walk = (n: TodoNode, depth: number) => {
    const pad = depth * 16;
    const mark = n.checked ? "✅" : "⬜";
    rows.push(
      `<div style="padding-left:${pad}px; margin:6px 0; font-family: ui-sans-serif,system-ui; font-size:14px;">
        <span style="margin-right:8px;">${mark}</span>
        <span>${escapeHtml(n.title)}</span>
      </div>`
    );
    (n.children ?? []).forEach((c) => walk(c, depth + 1));
  };

  roots.forEach((r) => walk(r, 0));

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Nested Todo</title>
</head>
<body style="margin:24px; background:white; color:#111;">
  <h2 style="font-family: ui-sans-serif,system-ui; margin:0 0 12px;">Nested Todo</h2>
  <div>${rows.join("")}</div>
  <div style="margin-top:18px; font-family: ui-sans-serif,system-ui; color:#666; font-size:12px;">
    Exported from Nested Todo
  </div>
</body>
</html>`;
}

export function exportPDFViaPrint(roots: TodoNode[]) {
  // English comment: Use browser print dialog → Save as PDF.
  const html = exportPrintableHTML(roots);
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
