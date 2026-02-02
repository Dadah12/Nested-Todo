import type { TodoNode } from "../types";

export function makeId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(2, 7);
}

export function createNode(title: string): TodoNode {
  return { id: makeId(), title, checked: false, collapsed: false, children: [] };
}

function cloneNode(n: TodoNode): TodoNode {
  return { ...n, children: (n.children ?? []).map(cloneNode) };
}

function mapTree(roots: TodoNode[], fn: (n: TodoNode) => TodoNode): TodoNode[] {
  const walk = (n: TodoNode): TodoNode => {
    const next = fn({ ...n });
    next.children = (next.children ?? []).map(walk);
    return next;
  };
  return roots.map(walk);
}

function updateNode(roots: TodoNode[], id: string, fn: (n: TodoNode) => TodoNode): TodoNode[] {
  const walk = (n: TodoNode): TodoNode => {
    if (n.id === id) {
      const updated = fn({ ...n });
      updated.children = (updated.children ?? []).map(cloneNode);
      return updated;
    }
    return { ...n, children: (n.children ?? []).map(walk) };
  };
  return roots.map(walk);
}

export function addRoot(roots: TodoNode[], title: string): TodoNode[] {
  const next = roots.map(cloneNode);
  next.push(createNode(title));
  return next;
}

export function addChild(roots: TodoNode[], parentId: string, title: string): TodoNode[] {
  return updateNode(roots, parentId, (n) => {
    const next = { ...n };
    next.collapsed = false;
    next.children = [...(next.children ?? []), createNode(title)];
    return next;
  });
}

export function upsertUnderParent(roots: TodoNode[], parentId: string, nodes: TodoNode[]): TodoNode[] {
  return updateNode(roots, parentId, (n) => {
    const next = { ...n };
    next.collapsed = false;
    next.children = [...(next.children ?? []), ...nodes.map(cloneNode)];
    return next;
  });
}

export function insertManyRoots(roots: TodoNode[], nodes: TodoNode[]): TodoNode[] {
  return [...roots.map(cloneNode), ...nodes.map(cloneNode)];
}

export function renameNode(roots: TodoNode[], id: string, title: string): TodoNode[] {
  return updateNode(roots, id, (n) => ({ ...n, title }));
}

export function toggleCollapse(roots: TodoNode[], id: string): TodoNode[] {
  return updateNode(roots, id, (n) => ({ ...n, collapsed: !n.collapsed }));
}

export function expandAll(roots: TodoNode[]): TodoNode[] {
  return mapTree(roots, (n) => ({ ...n, collapsed: false }));
}

export function collapseAll(roots: TodoNode[]): TodoNode[] {
  return mapTree(roots, (n) => ({ ...n, collapsed: true }));
}

export function deleteNode(roots: TodoNode[], id: string): TodoNode[] {
  const walk = (arr: TodoNode[]): TodoNode[] => {
    const out: TodoNode[] = [];
    for (const n of arr) {
      if (n.id === id) continue;
      out.push({ ...n, children: walk(n.children ?? []) });
    }
    return out;
  };
  return walk(roots.map(cloneNode));
}

function setCheckedDeep(n: TodoNode, checked: boolean): TodoNode {
  return {
    ...n,
    checked,
    children: (n.children ?? []).map((c) => setCheckedDeep(c, checked)),
  };
}

/**
 * English comment:
 * - Leaf tasks: user-controlled.
 * - Parent tasks: auto-check when all children are checked.
 * - If user toggles a parent, we cascade to children (common UX).
 */
function syncParentChecks(n: TodoNode): TodoNode {
  if (!n.children?.length) return n;

  const kids = n.children.map(syncParentChecks);
  const allKidsChecked = kids.length > 0 && kids.every((k) => k.checked);

  return {
    ...n,
    children: kids,
    checked: allKidsChecked,
  };
}

export function toggleCheck(roots: TodoNode[], id: string): TodoNode[] {
  // 1) toggle + cascade if parent
  const next = mapTree(roots, (n) => {
    if (n.id !== id) return n;
    const to = !n.checked;
    if (n.children?.length) return setCheckedDeep(n, to);
    return { ...n, checked: to };
  });

  // 2) sync parents bottom-up
  return next.map(syncParentChecks);
}

export function getProgress(roots: TodoNode[]): { done: number; total: number; pct: number } {
  let done = 0;
  let total = 0;

  const walk = (n: TodoNode) => {
    total += 1;
    if (n.checked) done += 1;
    (n.children ?? []).forEach(walk);
  };

  roots.forEach(walk);
  const pct = total ? Math.round((done / total) * 100) : 0;
  return { done, total, pct };
}

export function countByChecked(roots: TodoNode[]): { todo: number; done: number } {
  let todo = 0;
  let done = 0;

  const walk = (n: TodoNode) => {
    if (n.checked) done += 1;
    else todo += 1;
    (n.children ?? []).forEach(walk);
  };

  roots.forEach(walk);
  return { todo, done };
}

/**
 * English comment:
 * Tab filter keeps structure:
 * - Todo tab: shows nodes that are not checked OR have any unchecked descendant.
 * - Done tab: shows nodes that are checked OR have any checked descendant.
 */
export function filterByTab(roots: TodoNode[], tab: "todo" | "done"): TodoNode[] {
  const keep = (n: TodoNode): boolean => {
    if (tab === "todo") {
      if (!n.checked) return true;
      return (n.children ?? []).some(keep);
    }
    // done tab
    if (n.checked) return true;
    return (n.children ?? []).some(keep);
  };

  const filterNode = (n: TodoNode): TodoNode | null => {
    if (!keep(n)) return null;
    const kids = (n.children ?? []).map(filterNode).filter(Boolean) as TodoNode[];
    return { ...n, children: kids };
  };

  return roots.map(filterNode).filter(Boolean) as TodoNode[];
}

/**
 * English comment:
 * Search filter keeps matching nodes + their ancestors.
 */
export function filterByQuery(roots: TodoNode[], query: string): TodoNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return roots.map(cloneNode);

  const match = (n: TodoNode) => n.title.toLowerCase().includes(q);

  const filterNode = (n: TodoNode): TodoNode | null => {
    const kids = (n.children ?? []).map(filterNode).filter(Boolean) as TodoNode[];
    if (match(n) || kids.length) return { ...n, children: kids };
    return null;
  };

  return roots.map(filterNode).filter(Boolean) as TodoNode[];
}
