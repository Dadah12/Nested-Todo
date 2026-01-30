import { uid } from "./ids";

/**
 * ✅ Self-contained type para hindi mag-"never"
 * Re-export mo na lang sa src/types.ts (instructions below)
 */
export type TodoNode = {
  id: string;
  title: string;
  checked: boolean;
  collapsed: boolean;
  children: TodoNode[];
  createdAt: number;
  updatedAt?: number;
};

export function createNode(title: string): TodoNode {
  const now = Date.now();
  return {
    id: uid(),
    title: title.trim() || "Untitled",
    checked: false,
    collapsed: false,
    children: [],
    createdAt: now,
    updatedAt: now,
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

/**
 * ✅ Immutable update by id (keeps referential stability when no change)
 */
export function updateById(roots: TodoNode[], id: string, fn: UpdateFn): TodoNode[] {
  const walk = (n: TodoNode): TodoNode => {
    if (n.id === id) return fn(n);

    if (n.children.length === 0) return n;

    let changed = false;
    const nextChildren = n.children.map((c) => {
      const next = walk(c);
      if (next !== c) changed = true;
      return next;
    });

    return changed ? { ...n, children: nextChildren, updatedAt: Date.now() } : n;
  };

  let changedRoots = false;
  const nextRoots = roots.map((r) => {
    const next = walk(r);
    if (next !== r) changedRoots = true;
    return next;
  });

  return changedRoots ? nextRoots : roots;
}

export function deleteById(roots: TodoNode[], id: string): TodoNode[] {
  const prune = (arr: TodoNode[]): TodoNode[] => {
    let changed = false;

    const kept: TodoNode[] = [];
    for (const n of arr) {
      if (n.id === id) {
        changed = true;
        continue;
      }

      if (n.children.length === 0) {
        kept.push(n);
        continue;
      }

      const kids = prune(n.children);
      if (kids !== n.children) {
        changed = true;
        kept.push({ ...n, children: kids, updatedAt: Date.now() });
      } else {
        kept.push(n);
      }
    }

    return changed ? kept : arr;
  };

  return prune(roots);
}

export function insertChild(roots: TodoNode[], parentId: string, title: string): TodoNode[] {
  const child = createNode(title);
  return updateById(roots, parentId, (n) => ({
    ...n,
    collapsed: false,
    children: [...n.children, child],
    updatedAt: Date.now(),
  }));
}

export function insertRoot(roots: TodoNode[], title: string): TodoNode[] {
  return [...roots, createNode(title)];
}

/**
 * ✅ Toggle leaf check.
 * If node has children, treat as toggle-all (set all descendant leaves).
 */
export function toggleCheck(roots: TodoNode[], id: string, target?: boolean): TodoNode[] {
  const current = findById(roots, id);
  if (!current) return roots;

  const desired =
    typeof target === "boolean"
      ? target
      : current.children.length
        ? !isComplete(current)
        : !current.checked;

  const setAllLeaves = (n: TodoNode): TodoNode => {
    if (n.children.length === 0) {
      return { ...n, checked: desired, updatedAt: Date.now() };
    }
    return {
      ...n,
      children: n.children.map(setAllLeaves),
      updatedAt: Date.now(),
    };
  };

  if (current.children.length) {
    return updateById(roots, id, (n) => setAllLeaves(n));
  }

  return updateById(roots, id, (n) => ({ ...n, checked: desired, updatedAt: Date.now() }));
}

export function toggleCollapse(roots: TodoNode[], id: string): TodoNode[] {
  return updateById(roots, id, (n) => ({ ...n, collapsed: !n.collapsed, updatedAt: Date.now() }));
}

export function rename(roots: TodoNode[], id: string, title: string): TodoNode[] {
  const nextTitle = title.trim() || "Untitled";
  return updateById(roots, id, (n) => ({ ...n, title: nextTitle, updatedAt: Date.now() }));
}

export function setCollapseAll(roots: TodoNode[], collapsed: boolean): TodoNode[] {
  const walk = (n: TodoNode): TodoNode => ({
    ...n,
    collapsed,
    children: n.children.map(walk),
    updatedAt: Date.now(),
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
export function reorderSiblings(
  roots: TodoNode[],
  parentId: string | null,
  activeId: string,
  overId: string
): TodoNode[] {
  const reorder = (arr: TodoNode[]): TodoNode[] => {
    const oldIndex = arr.findIndex((n) => n.id === activeId);
    const newIndex = arr.findIndex((n) => n.id === overId);
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return arr;

    const next = arr.slice();
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    return next;
  };

  if (parentId === null) return reorder(roots);

  return updateById(roots, parentId, (p) => ({ ...p, children: reorder(p.children), updatedAt: Date.now() }));
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

/** ✅ Safe finder (typed stack) — avoids 'never' inference */
export function findById(roots: TodoNode[], id: string): TodoNode | null {
  const stack: TodoNode[] = [...roots];
  while (stack.length) {
    const n = stack.pop();
    if (!n) break;
    if (n.id === id) return n;
    if (n.children.length) stack.push(...n.children);
  }
  return null;
}
