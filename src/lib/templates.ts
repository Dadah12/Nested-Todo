import type { TodoNode } from "../types";

function makeId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(2, 7);
}

function node(title: string, children: TodoNode[] = []): TodoNode {
  return { id: makeId(), title, checked: false, collapsed: false, children };
}

export const DEFAULT_TEMPLATE: TodoNode[] = [
  node("Example project", [
    node("Setup", [node("Install dependencies"), node("Run dev server")]),
    node("Build features", [node("Drag & drop reorder"), node("Upload CSV import")]),
  ]),
];
