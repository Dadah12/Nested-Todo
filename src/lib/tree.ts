// src/lib/tree.ts
// Pure helpers for working with the nested TodoNode tree.
// Keep functions small + predictable. No DOM, no side effects.

import type { TodoNode } from "../types";

export type ParentMap = Map<string, string | null>;

type LeafProgress = { done: number; total: number };

function makeId(): string {
  // Works in modern browsers. Fallback is good enough for local usage.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g: any = globalThis as any;
  if (g?.crypto?.randomUUID) return g.crypto.randomUUID();
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function safeChildren(n: TodoNode): TodoNode[] {
  return Array.isArray((n as any).children) ? ((n as any).children as TodoNode[]) : [];
}

export function hasChildren(n: TodoNode): boolean {
  return safeChildren(n).length > 0;
}

export function isComplete(n: TodoNode): boolean {
  const kids = safeChildren(n);
  if (!kids.length) return !!(n as any).checked;
  return kids.every(isComplete);
}

export function isIndeterminate(n: TodoNode): boolean {
  const kids = safeChildren(n);
  if (!kids.length) return false;
  const some = kids.some(isComplete);
  const all = kids.every(isComplete);
  return some && !all;
}

/**
 * "Done" = complete (leaf checked OR group fully complete).
 * We use this both for styling + for the Done tab grouping.
 */
export function isDoneGroup(n: TodoNode): boolean {
  return isComplete(n);
}

/**
 * For the tiny (done/total) badge beside group titles:
 * - counts DIRECT children only (not full descendants)
 * - a child counts as "done" if it isComplete()
 */
export function countProgress(n: TodoNode): { done: number; total: number } {
  const kids = safeChildren(n);
  if (!kids.length) return { done: (n as any).checked ? 1 : 0, total: 1 };

  const total = kids.length;
  const done = kids.reduce((acc, ch) => acc + (isComplete(ch) ? 1 : 0), 0);
  return { done, total };
}

function leafProgress(n: TodoNode): LeafProgress {
  const kids = safeChildren(n);
  if (!kids.length) return { done: (n as any).checked ? 1 : 0, total: 1 };

  return kids.reduce(
    (acc, ch) => {
      const p = leafProgress(ch);
      acc.done += p.done;
      acc.total += p.total;
      return acc;
    },
    { done: 0, total: 0 }
  );
}

/**
 * Progress for the whole tree, counting LEAF tasks only.
 * This matches the UI "All tasks 0/4" behavior.
 */
export function countProgressForest(roots: TodoNode[]): { done: number; total: number; pct: number } {
  const p = (roots ?? []).reduce(
    (acc, n) => {
      const lp = leafProgress(n);
      acc.done += lp.done;
      acc.total += lp.total;
      return acc;
    },
    { done: 0, total: 0 }
  );

  const pct = p.total === 0 ? 0 : Math.round((p.done / p.total) * 100);
  return { ...p, pct };
}

export function buildParentMap(roots: TodoNode[]): ParentMap {
  const map: ParentMap = new Map();

  const walk = (node: TodoNode, parentId: string | null) => {
    map.set((node as any).id, parentId);
    for (const ch of safeChildren(node)) walk(ch, (node as any).id);
  };

  for (const r of roots ?? []) walk(r, null);
  return map;
}

function setSubtreeChecked(node: TodoNode, checked: boolean): TodoNode {
  const kids = safeChildren(node);
  if (!kids.length) return { ...(node as any), checked } as TodoNode;

  return {
    ...(node as any),
    checked,
    children: kids.map((ch) => setSubtreeChecked(ch, checked)),
  } as TodoNode;
}

/**
 * Ensure parent.checked is always derived from children.
 * - leaf keeps its own checked
 * - group.checked becomes true ONLY if all children.checked are true
 */
function normalizeNode(node: TodoNode): TodoNode {
  const kids = safeChildren(node);
  if (!kids.length) return node;

  const normalizedKids = kids.map(normalizeNode);
  const checked = normalizedKids.length > 0 && normalizedKids.every((ch) => !!(ch as any).checked);

  return {
    ...(node as any),
    checked,
    children: normalizedKids,
  } as TodoNode;
}

export function normalizeTree(roots: TodoNode[]): TodoNode[] {
  return (roots ?? []).map(normalizeNode);
}

function mapTree(roots: TodoNode[], fn: (n: TodoNode) => TodoNode): TodoNode[] {
  const walk = (n: TodoNode): TodoNode => {
    const kids = safeChildren(n).map(walk);
    const next = fn({ ...(n as any), children: kids } as TodoNode);
    return next;
  };

  return (roots ?? []).map(walk);
}

export function insertRoot(roots: TodoNode[], title: string): TodoNode[] {
  const node: TodoNode = {
    id: makeId(),
    title: title.trim(),
    checked: false,
    collapsed: false,
    children: [],
  } as TodoNode;

  return normalizeTree([...(roots ?? []), node]);
}

export function insertChild(roots: TodoNode[], parentId: string, title: string): TodoNode[] {
  const next = mapTree(roots ?? [], (n) => {
    if ((n as any).id !== parentId) return n;

    const child: TodoNode = {
      id: makeId(),
      title: title.trim(),
      checked: false,
      collapsed: false,
      children: [],
    } as TodoNode;

    const kids = safeChildren(n);
    return {
      ...(n as any),
      collapsed: false,
      children: [...kids, child],
    } as TodoNode;
  });

  return normalizeTree(next);
}

export function rename(roots: TodoNode[], id: string, title: string): TodoNode[] {
  const next = mapTree(roots ?? [], (n) => ((n as any).id === id ? ({ ...(n as any), title } as TodoNode) : n));
  return normalizeTree(next);
}

function deleteWalk(nodes: TodoNode[], id: string): TodoNode[] {
  const out: TodoNode[] = [];

  for (const n of nodes ?? []) {
    if ((n as any).id === id) continue;
    const kids = deleteWalk(safeChildren(n), id);
    out.push({ ...(n as any), children: kids } as TodoNode);
  }

  return out;
}

export function deleteById(roots: TodoNode[], id: string): TodoNode[] {
  return normalizeTree(deleteWalk(roots ?? [], id));
}

export function toggleCollapse(roots: TodoNode[], id: string): TodoNode[] {
  return mapTree(roots ?? [], (n) => {
    if ((n as any).id !== id) return n;
    return { ...(n as any), collapsed: !(n as any).collapsed } as TodoNode;
  });
}

export function setCollapseAll(roots: TodoNode[], collapsed: boolean): TodoNode[] {
  return mapTree(roots ?? [], (n) => {
    if (!hasChildren(n)) return n;
    return { ...(n as any), collapsed } as TodoNode;
  });
}

export function toggleCheck(roots: TodoNode[], id: string): TodoNode[] {
  const next = mapTree(roots ?? [], (n) => {
    if ((n as any).id !== id) return n;

    const kids = safeChildren(n);
    const current = !!(n as any).checked;
    const nextVal = !current;

    if (!kids.length) return { ...(n as any), checked: nextVal } as TodoNode;
    return setSubtreeChecked(n, nextVal);
  });

  return normalizeTree(next);
}

export function filterByQuery(roots: TodoNode[], queryRaw: string): TodoNode[] {
  const q = queryRaw.trim().toLowerCase();
  if (!q) return roots ?? [];

  const filterNode = (n: TodoNode): TodoNode | null => {
    const kids = safeChildren(n);
    const keptKids = kids.map(filterNode).filter(Boolean) as TodoNode[];
    const selfMatch = ((n as any).title ?? "").toLowerCase().includes(q);

    if (!selfMatch && keptKids.length === 0) return null;
    return { ...(n as any), children: keptKids, collapsed: false } as TodoNode;
  };

  return (roots ?? []).map(filterNode).filter(Boolean) as TodoNode[];
}

export function parseIndented(text: string): TodoNode[] {
  const lines = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.replace(/\t/g, "  "));

  const roots: TodoNode[] = [];
  const stack: Array<{ depth: number; node: TodoNode }> = [];

  for (const raw of lines) {
    const line = raw.replace(/\s+$/g, "");
    if (!line.trim()) continue;

    const leadingSpaces = (line.match(/^\s*/) ?? [""])[0].length;
    const depth = Math.floor(leadingSpaces / 2);
    const title = line.trim();

    const node: TodoNode = {
      id: makeId(),
      title,
      checked: false,
      collapsed: false,
      children: [],
    } as TodoNode;

    while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop();

    if (!stack.length) {
      roots.push(node);
      stack.push({ depth, node });
    } else {
      const parent = stack[stack.length - 1].node;
      (parent as any).children = [...safeChildren(parent), node];
      stack.push({ depth, node });
    }
  }

  return normalizeTree(roots);
}

export function reorderSiblings(roots: TodoNode[], parentId: string | null, activeId: string, overId: string): TodoNode[] {
  const reorder = (arr: TodoNode[]) => {
    const from = arr.findIndex((x) => (x as any).id === activeId);
    const to = arr.findIndex((x) => (x as any).id === overId);
    if (from < 0 || to < 0) return arr;

    const copy = arr.slice();
    const [moved] = copy.splice(from, 1);
    copy.splice(to, 0, moved);
    return copy;
  };

  if (parentId === null) return normalizeTree(reorder(roots ?? []));

  const next = mapTree(roots ?? [], (n) => {
    if ((n as any).id !== parentId) return n;
    return { ...(n as any), children: reorder(safeChildren(n)) } as TodoNode;
  });

  return normalizeTree(next);
}
