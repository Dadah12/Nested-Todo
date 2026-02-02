import type { TodoNode } from "../types";

export type FlatItem = TodoNode & {
  parentId: string | null;
  depth: number;
  childrenCount: number;
};

export function flattenTree(roots: TodoNode[]): FlatItem[] {
  const out: FlatItem[] = [];
  const walk = (n: TodoNode, parentId: string | null, depth: number) => {
    out.push({
      ...n,
      parentId,
      depth,
      childrenCount: n.children?.length ?? 0,
    });
    (n.children ?? []).forEach((c) => walk(c, n.id, depth + 1));
  };
  roots.forEach((r) => walk(r, null, 0));
  return out;
}

export function getVisibleItems(flat: FlatItem[]): FlatItem[] {
  // English comment: Only show nodes whose ancestors are not collapsed.
  const byId = new Map<string, FlatItem>();
  flat.forEach((x) => byId.set(x.id, x));

  const isVisible = (item: FlatItem) => {
    let p = item.parentId ? byId.get(item.parentId) : null;
    while (p) {
      if (p.collapsed) return false;
      p = p.parentId ? byId.get(p.parentId) : null;
    }
    return true;
  };

  return flat.filter(isVisible);
}

function cloneNode(n: TodoNode): TodoNode {
  return { ...n, children: (n.children ?? []).map(cloneNode) };
}

function findNodeAndParent(
  roots: TodoNode[],
  id: string
): { node: TodoNode | null; parent: TodoNode | null; index: number } {
  const walk = (arr: TodoNode[], parent: TodoNode | null): any => {
    for (let i = 0; i < arr.length; i++) {
      const node = arr[i];
      if (node.id === id) return { node, parent, index: i };
      const found = walk(node.children ?? [], node);
      if (found.node) return found;
    }
    return { node: null, parent: null, index: -1 };
  };
  return walk(roots, null);
}

function removeNode(roots: TodoNode[], id: string): { next: TodoNode[]; removed: TodoNode | null } {
  const next = roots.map(cloneNode);
  const found = findNodeAndParent(next, id);
  if (!found.node) return { next, removed: null };

  const arr = found.parent ? (found.parent.children ?? []) : next;
  const [removed] = arr.splice(found.index, 1);
  if (found.parent) found.parent.children = arr;
  return { next, removed };
}

function insertNode(
  roots: TodoNode[],
  node: TodoNode,
  parentId: string | null,
  index: number
): TodoNode[] {
  const next = roots.map(cloneNode);
  if (!parentId) {
    const idx = Math.max(0, Math.min(index, next.length));
    next.splice(idx, 0, cloneNode(node));
    return next;
  }

  const foundParent = findNodeAndParent(next, parentId);
  if (!foundParent.node) {
    const idx = Math.max(0, Math.min(index, next.length));
    next.splice(idx, 0, cloneNode(node));
    return next;
  }

  const p = foundParent.node;
  const kids = (p.children ?? []).map(cloneNode);
  const idx = Math.max(0, Math.min(index, kids.length));
  kids.splice(idx, 0, cloneNode(node));
  p.children = kids;
  return next;
}

function getSiblings(roots: TodoNode[], parentId: string | null): TodoNode[] {
  if (!parentId) return roots;
  const found = findNodeAndParent(roots, parentId);
  return found.node?.children ?? [];
}

function getParentId(flat: FlatItem[], id: string): string | null {
  return flat.find((x) => x.id === id)?.parentId ?? null;
}

/**
 * English comment:
 * Drag behavior:
 * - Vertical drag decides ordering.
 * - Horizontal drag (offsetX) decides indent/outdent.
 *   > slide right = indent (become child of previous visible item)
 *   > slide left  = outdent (move up one level)
 */
export function reorderTreeByDnD(args: {
  roots: TodoNode[];
  activeId: string;
  overId: string;
  offsetX: number;
}): TodoNode[] {
  const { roots, activeId, overId, offsetX } = args;
  if (!activeId || !overId || activeId === overId) return roots;

  const flatAll = flattenTree(roots);
  const visible = getVisibleItems(flatAll);

  const fromIndex = visible.findIndex((x) => x.id === activeId);
  const toIndex = visible.findIndex((x) => x.id === overId);
  if (fromIndex < 0 || toIndex < 0) return roots;

  const INDENT_PX = 22;
  const OUTDENT_PX = -22;

  const currentParent = getParentId(flatAll, activeId);
  let targetParent: string | null = currentParent;

  if (offsetX >= INDENT_PX) {
    const prev = visible[Math.max(0, toIndex - 1)];
    if (prev && prev.id !== activeId) targetParent = prev.id;
  } else if (offsetX <= OUTDENT_PX) {
    if (currentParent) targetParent = getParentId(flatAll, currentParent);
    else targetParent = null;
  }

  const { next: without, removed } = removeNode(roots, activeId);
  if (!removed) return roots;

  const targetSiblings = getSiblings(without, targetParent);
  const overInTarget = targetSiblings.findIndex((n) => n.id === overId);

  let insertIndex = targetSiblings.length;
  if (overInTarget >= 0) {
    insertIndex = overInTarget;

    // If moving downward in same target list, drop after
    if (toIndex > fromIndex) insertIndex = overInTarget + 1;
  }

  return insertNode(without, removed, targetParent, insertIndex);
}
