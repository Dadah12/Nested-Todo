import type { TodoNode } from "../types";
import { uid } from "./ids";

export function createNode(title: string): TodoNode {
  return {
    id: uid(),
    title: title.trim() || "Untitled",
    checked: false,
    collapsed: false,
    children: [],
    createdAt: Date.now(),
  };
}

/** Leaf completion is node.checked. Parent completion is derived: all descendants complete. */
export function isComplete(node: TodoNode): boolean {
  if (node.children.length === 0) return !!node.checked;
  return node.children.every(isComplete);
}

/** Parent indeterminate = has children AND (some complete) AND (not all complete). */
export function isIndeterminate(node: TodoNode): boolean {
  if (node.children.length === 0) return false;
  const all = node.children.every(isComplete);
  const some = node.children.some((c) => isComplete(c) || hasAnyComplete(c));
  return some && !all;
}

function hasAnyComplete(node: TodoNode): boolean {
  if (node.children.length === 0) return !!node.checked;
  return node.children.some((c) => isComplete(c) || hasAnyComplete(c));
}

export function hasChildren(node: TodoNode): boolean {
  return node.children.length > 0;
}

/** Done-tab rule: a node is "done-group" only if it has children and all descendants are complete. */
export function isDoneGroup(node: TodoNode): boolean {
  return node.children.length > 0 && isComplete(node);
}

export function countProgress(node: TodoNode): { done: number; total: number } {
  // Count leaf items only for progress, plus include parents with no children (they behave like leaf tasks).
  if (node.children.length === 0) {
    return { done: node.checked ? 1 : 0, total: 1 };
  }
  return node.children.reduce(
    (acc, child) => {
      const p = countProgress(child);
      acc.done += p.done;
      acc.total += p.total;
      return acc;
    },
    { done: 0, total: 0 }
  );
}

export function countProgressForest(roots: TodoNode[]): { done: number; total: number } {
  return roots.reduce(
    (acc, r) => {
      const p = countProgress(r);
      acc.done += p.done;
      acc.total += p.total;
      return acc;
    },
    { done: 0, total: 0 }
  );
}

export type UpdateFn = (node: TodoNode) => TodoNode;

export function updateById(roots: TodoNode[], id: string, fn: UpdateFn): TodoNode[] {
  const walk = (n: TodoNode): TodoNode => {
    if (n.id === id) return fn(n);
    if (!n.children.length) return n;
    const nextChildren = n.children.map(walk);
    if (nextChildren === n.children) return n;
    // Map always returns new array; keep referential stability by checking equality
    const same = nextChildren.every((c, i) => c === n.children[i]);
    if (same) return n;
    return { ...n, children: nextChildren };
  };
  const nextRoots = roots.map(walk);
  const same = nextRoots.every((r, i) => r === roots[i]);
  return same ? roots : nextRoots;
}

export function deleteById(roots: TodoNode[], id: string): TodoNode[] {
  const prune = (arr: TodoNode[]): TodoNode[] => {
    let changed = false;
    const next = arr
      .filter((n) => {
        const keep = n.id !== id;
        if (!keep) changed = true;
        return keep;
      })
      .map((n) => {
        if (!n.children.length) return n;
        const kids = prune(n.children);
        if (kids === n.children) return n;
        changed = true;
        return { ...n, children: kids };
      });
    return changed ? next : arr;
  };
  return prune(roots);
}

export function insertChild(roots: TodoNode[], parentId: string, title: string): TodoNode[] {
  const child = createNode(title);
  return updateById(roots, parentId, (n) => ({ ...n, collapsed: false, children: [...n.children, child] }));
}

export function insertRoot(roots: TodoNode[], title: string): TodoNode[] {
  return [...roots, createNode(title)];
}

/** Toggle leaf check. If node has children, treat as toggle-all (set all descendant leaves). */
export function toggleCheck(roots: TodoNode[], id: string, target?: boolean): TodoNode[] {
  // First locate node to decide desired toggle
  let current: TodoNode | null = null;
  const find = (arr: TodoNode[]) => {
    for (const n of arr) {
      if (n.id === id) {
        current = n;
        return;
      }
      if (n.children.length) find(n.children);
      if (current) return;
    }
  };
  find(roots);
  if (!current) return roots;

  const desired = typeof target === "boolean" ? target : (current.children.length ? !isComplete(current) : !current.checked);

  const setAllLeaves = (n: TodoNode): TodoNode => {
    if (n.children.length === 0) return { ...n, checked: desired };
    return { ...n, children: n.children.map(setAllLeaves) };
  };

  if (current.children.length) {
    return updateById(roots, id, (n) => setAllLeaves(n));
  }
  return updateById(roots, id, (n) => ({ ...n, checked: desired }));
}

export function toggleCollapse(roots: TodoNode[], id: string): TodoNode[] {
  return updateById(roots, id, (n) => ({ ...n, collapsed: !n.collapsed }));
}

export function rename(roots: TodoNode[], id: string, title: string): TodoNode[] {
  const nextTitle = title.trim() || "Untitled";
  return updateById(roots, id, (n) => ({ ...n, title: nextTitle }));
}

export function setCollapseAll(roots: TodoNode[], collapsed: boolean): TodoNode[] {
  const walk = (n: TodoNode): TodoNode => ({
    ...n,
    collapsed,
    children: n.children.map(walk),
  });
  return roots.map(walk);
}

export function buildParentMap(roots: TodoNode[]): Map<string, string | null> {
  const map = new Map<string, string | null>();
  const walk = (arr: TodoNode[], parent: string | null) => {
    for (const n of arr) {
      map.set(n.id, parent);
      if (n.children.length) walk(n.children, n.id);
    }
  };
  walk(roots, null);
  return map;
}

/** Reorder siblings within the same parent (including roots when parent is null). */
export function reorderSiblings(roots: TodoNode[], parentId: string | null, activeId: string, overId: string): TodoNode[] {
  const reorder = (arr: TodoNode[]) => {
    const oldIndex = arr.findIndex((n) => n.id === activeId);
    const newIndex = arr.findIndex((n) => n.id === overId);
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return arr;
    const next = arr.slice();
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    return next;
  };

  if (parentId === null) return reorder(roots);

  return updateById(roots, parentId, (p) => ({ ...p, children: reorder(p.children) }));
}

/** Search: keep only nodes that match or have a descendant match. */
export function filterByQuery(roots: TodoNode[], query: string): TodoNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return roots;

  const walk = (n: TodoNode): TodoNode | null => {
    const selfMatch = n.title.toLowerCase().includes(q);
    const kids = n.children.map(walk).filter(Boolean) as TodoNode[];
    if (selfMatch || kids.length) {
      return { ...n, collapsed: false, children: kids };
    }
    return null;
  };

  return roots.map(walk).filter(Boolean) as TodoNode[];
}

/** Flatten for export: one row per node with full path. */
export function flattenForExport(roots: TodoNode[]) {
  const rows: Array<{
    rootTitle: string;
    fullPath: string;
    title: string;
    checked: "YES" | "NO";
    isDoneGroup: "YES" | "NO";
  }> = [];

  const walk = (n: TodoNode, rootTitle: string, path: string[]) => {
    const fullPath = path.join(" > ");
    rows.push({
      rootTitle,
      fullPath,
      title: n.title,
      checked: isComplete(n) ? "YES" : "NO",
      isDoneGroup: isDoneGroup(n) ? "YES" : "NO",
    });
    n.children.forEach((c) => walk(c, rootTitle, [...path, c.title]));
  };

  roots.forEach((r) => walk(r, r.title, [r.title]));
  return rows;
}

/** Quick-add parser: indentation builds nesting. 2 spaces or 1 tab = 1 level. */
export function parseIndented(text: string): TodoNode[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+$/g, ""))
    .filter((l) => l.trim().length > 0);

  type StackItem = { depth: number; node: TodoNode };

  const roots: TodoNode[] = [];
  const stack: StackItem[] = [];

  const depthOf = (line: string) => {
    let spaces = 0;
    for (const ch of line) {
      if (ch === " ") spaces += 1;
      else if (ch === "\t") spaces += 2;
      else break;
    }
    return Math.floor(spaces / 2);
  };

  for (const raw of lines) {
    const depth = depthOf(raw);
    const title = raw.trim().replace(/^[-*]\s+/, ""); // allow "- task" style
    const node = createNode(title);

    while (stack.length && stack[stack.length - 1]!.depth >= depth) stack.pop();

    if (stack.length === 0) {
      roots.push(node);
      stack.push({ depth, node });
    } else {
      const parent = stack[stack.length - 1]!.node;
      parent.children.push(node);
      parent.collapsed = false;
      stack.push({ depth, node });
    }
  }

  return roots;
}
