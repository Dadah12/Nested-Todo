import { flattenForExport } from "./tree";
import type { TodoNode } from "../types";

function escCsv(val: string): string {
  const s = val.replace(/"/g, '""');
  return /[",\n]/.test(s) ? `"${s}"` : s;
}

export function exportCSV(roots: TodoNode[]) {
  const rows = flattenForExport(roots);
  const headers = ["Root", "Full Path", "Title", "Checked (Derived)", "Done-Group"];
  const body = rows.map((r) => [r.rootTitle, r.fullPath, r.title, r.checked, r.isDoneGroup].map(escCsv).join(","));
  const csv = [headers.join(","), ...body].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  a.href = url;
  a.download = `nested-todos_${y}-${m}-${d}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportPrintable(roots: TodoNode[]) {
  const rows = flattenForExport(roots);

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Nested Todos (Print)</title>
  <style>
    :root{font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;}
    body{padding:24px; color:#111;}
    h1{font-size:18px;margin:0 0 12px;}
    .meta{color:#666;font-size:12px;margin-bottom:16px;}
    table{width:100%; border-collapse: collapse; font-size:12px;}
    th, td{border:1px solid #ddd; padding:8px; vertical-align: top;}
    th{background:#f5f5f5; text-align:left;}
    .yes{font-weight:600;}
    @media print{ body{padding:0} }
  </style>
</head>
<body>
  <h1>Nested Todos</h1>
  <div class="meta">Generated: ${new Date().toLocaleString()}</div>
  <table>
    <thead>
      <tr>
        <th style="width:20%">Root</th>
        <th style="width:46%">Full Path</th>
        <th style="width:18%">Checked</th>
        <th style="width:16%">Done Group</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map(r => `
        <tr>
          <td>${escapeHtml(r.rootTitle)}</td>
          <td>${escapeHtml(r.fullPath)}</td>
          <td class="${r.checked === "YES" ? "yes" : ""}">${r.checked === "YES" ? "✓" : "—"}</td>
          <td>${r.isDoneGroup === "YES" ? "✓" : "—"}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>
</body>
</html>`;

  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  // Let the browser layout first
  setTimeout(() => win.print(), 250);
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
