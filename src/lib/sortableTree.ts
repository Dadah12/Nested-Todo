import type { TodoNode } from "../types";

export type FlatItem = TodoNode & {
  parentId: string | null;
  depth: number;
  childrenCount: number;
};

export const INDENTATION_WIDTH = 18;

// Simple array move helper
function arrayMove<T>(arr: T[], from: number, to: number) {
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function flattenTree(
  roots: TodoNode[],
  parentId: string | null = null,
  depth = 0
): FlatItem[] {
  const out: FlatItem[] = [];

  for (const node of roots) {
    const childrenFlat = flattenTree(node.children ?? [], node.id, depth + 1);

    out.push({
      ...(node as any),
      parentId,
      depth,
      // English comment: Number of descendants in the flattened list.
      childrenCount: childrenFlat.length,
    });

    out.push(...childrenFlat);
  }

  return out;
}

export function buildTree(items: FlatItem[]): TodoNode[] {
  const map = new Map<string, TodoNode>();
  const roots: TodoNode[] = [];

  // First pass: create clean nodes
  for (const it of items) {
    const { parentId, depth, childrenCount, ...node } = it as any;

    map.set(node.id, {
      ...node,
      children: [],
    });
  }

  // Second pass: attach children
  for (const it of items) {
    const node = map.get(it.id)!;

    if (it.parentId) {
      const parent = map.get(it.parentId);
      if (parent) parent.children.push(node);
      else roots.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

// Removes descendants of collapsed nodes from the visible list
export function getVisibleItems(items: FlatItem[]): FlatItem[] {
  const out: FlatItem[] = [];
  let skipDepth: number | null = null;

  for (const it of items) {
    if (skipDepth !== null) {
      if (it.depth > skipDepth) continue;
      skipDepth = null;
    }

    out.push(it);

    if ((it as any).collapsed) {
      skipDepth = it.depth;
    }
  }

  return out;
}

function findIndex(items: FlatItem[], id: string) {
  return items.findIndex((x) => x.id === id);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function getParentIdForDepth(items: FlatItem[], insertIndex: number, depth: number): string | null {
  if (depth <= 0) return null;

  // English comment: Find the nearest previous item with depth = depth - 1
  for (let i = insertIndex - 1; i >= 0; i--) {
    if (items[i].depth === depth - 1) return items[i].id;
  }
  return null;
}

export function reorderTreeByDnD(params: {
  roots: TodoNode[];
  activeId: string;
  overId: string;
  offsetX: number;
}) {
  const { roots, activeId, overId, offsetX } = params;

  const flat = flattenTree(roots);
  const activeIndex = findIndex(flat, activeId);
  const overIndex = findIndex(flat, overId);

  if (activeIndex === -1 || overIndex === -1) return roots;

  const active = flat[activeIndex];
  const blockLen = 1 + (active.childrenCount ?? 0);
  const block = flat.slice(activeIndex, activeIndex + blockLen);

  // English comment: If "over" is inside the active subtree block, ignore.
  if (overIndex >= activeIndex && overIndex < activeIndex + blockLen) return roots;

  // Remove block
  const without = flat.slice(0, activeIndex).concat(flat.slice(activeIndex + blockLen));

  // Find insert position (before over item)
  const overIndexWithout = findIndex(without, overId);
  if (overIndexWithout === -1) return roots;

  // Compute projected depth based on horizontal drag
  const depthDelta = Math.round(offsetX / INDENTATION_WIDTH);
  const baseDepth = active.depth;

  const prev = without[overIndexWithout - 1];
  const next = without[overIndexWithout];

  const maxDepth = prev ? prev.depth + 1 : 0;
  const minDepth = next ? next.depth : 0;

  const projectedDepth = clamp(baseDepth + depthDelta, minDepth, maxDepth);
  const newParentId = getParentIdForDepth(without, overIndexWithout, projectedDepth);

  // Apply new depth to the whole subtree block (keep internal structure)
  const depthShift = projectedDepth - baseDepth;

  const updatedBlock = block.map((it, idx) => {
    const updated: FlatItem = { ...(it as any) };

    updated.depth = it.depth + depthShift;

    if (idx === 0) {
      // English comment: Only the root of the moved block changes parentId.
      updated.parentId = newParentId;
    } else {
      // English comment: Keep subtree parent links as-is.
      updated.parentId = it.parentId;
    }

    return updated;
  });

  // Insert block
  const nextFlat = without
    .slice(0, overIndexWithout)
    .concat(updatedBlock, without.slice(overIndexWithout));

  // Rebuild tree
  return buildTree(nextFlat);
}
