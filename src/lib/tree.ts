import type { TodoNode } from "../types";

/** Safe helpers */
const kids = (n: TodoNode) => (Array.isArray((n as any).children) ? (n as any).children : []) as TodoNode[];

export function hasChildren(node: TodoNode) {
  return kids(node).length > 0;
}

/** Count progress ONLY for descendants (not including the node itself) */
export function countProgress(node: TodoNode) {
  let done = 0;
  let total = 0;

  const stack: TodoNode[] = [...kids(node)];
  while (stack.length) {
    const cur = stack.pop()!;
    total += 1;
    if ((cur as any).checked) done += 1;

    const c = kids(cur);
    if (c.length) stack.push(...c);
  }

  return { done, total };
}

/** Whole forest progress (includes ALL nodes) */
export function countProgressForest(roots: TodoNode[]) {
  let done = 0;
  let total = 0;

  const stack: TodoNode[] = [...(roots ?? [])];
  while (stack.length) {
    const cur = stack.pop()!;
    total += 1;
    if ((cur as any).checked) done += 1;

    const c = kids(cur);
    if (c.length) stack.push(...c);
  }

  return { done, total };
}

export function isIndeterminate(node: TodoNode) {
  if (!hasChildren(node)) return false;
  const p = countProgress(node);
  return p.total > 0 && p.done > 0 && p.done < p.total;
}

export function isComplete(node: TodoNode) {
  if (!hasChildren(node)) return !!(node as any).checked;
  const p = countProgress(node);
  return p.total > 0 && p.done === p.total;
}

/** Used by your tabs: treat a "done group" as a parent that has children and is complete */
export function isDoneGroup(node: TodoNode) {
  return hasChildren(node) && isComplete(node);
}

/** Parent map: childId -> parentId (null if root) */
export function buildParentMap(roots: TodoNode[]) {
  const map = new Map<string, string | null>();

  const walk = (nodes: TodoNode[], parentId: string | null) => {
    for (const n of nodes) {
      map.set((n as any).id, parentId);
      const c = kids(n);
      if (c.length) walk(c, (n as any).id);
    }
  };

  walk(roots ?? [], null);
  return map;
}

/** Normalize:
 * - ensure children arrays exist
 * - ensure booleans exist
 * - sync parent.checked = children.every(child.checked)
 */
export function normalizeTree(roots: TodoNode[]) {
  const normNode = (n: TodoNode): TodoNode => {
    const childList = kids(n).map(normNode);

    const checkedSelf = !!(n as any).checked;
    const collapsedSelf = !!(n as any).collapsed;

    const checked =
      childList.length > 0 ? childList.every((c) => !!(c as any).checked) : checkedSelf;

    return {
      ...(n as any),
      checked,
      collapsed: collapsedSelf,
      children: childList,
    } as TodoNode;
  };

  return (roots ?? []).map(normNode);
}

export function insertRoot(roots: TodoNode[], node: TodoNode) {
  return [...(roots ?? []), node];
}

export function insertChild(roots: TodoNode[], parentId: string, child: TodoNode) {
  const walk = (nodes: TodoNode[]): TodoNode[] => {
    return nodes.map((n) => {
      if ((n as any).id === parentId) {
        const nextKids = [...kids(n), child];
        const checked = nextKids.length ? nextKids.every((c) => !!(c as any).checked) : !!(n as any).checked;
        return { ...(n as any), children: nextKids, checked } as TodoNode;
      }

      const c = kids(n);
      if (!c.length) return n;

      const next = walk(c);
      const checked = next.length ? next.every((x) => !!(x as any).checked) : !!(n as any).checked;
      return { ...(n as any), children: next, checked } as TodoNode;
    });
  };

  return walk(roots ?? []);
}

export function rename(roots: TodoNode[], id: string, title: string) {
  const walk = (nodes: TodoNode[]): TodoNode[] =>
    nodes.map((n) => {
      if ((n as any).id === id) return { ...(n as any), title } as TodoNode;

      const c = kids(n);
      if (!c.length) return n;

      const next = walk(c);
      return { ...(n as any), children: next } as TodoNode;
    });

  return walk(roots ?? []);
}

export function deleteById(roots: TodoNode[], id: string) {
  const walk = (nodes: TodoNode[]): TodoNode[] => {
    const out: TodoNode[] = [];
    for (const n of nodes) {
      if ((n as any).id === id) continue;

      const c = kids(n);
      if (!c.length) {
        out.push(n);
        continue;
      }

      const next = walk(c);
      const checked = next.length ? next.every((x) => !!(x as any).checked) : !!(n as any).checked;
      out.push({ ...(n as any), children: next, checked } as TodoNode);
    }
    return out;
  };

  return walk(roots ?? []);
}

export function toggleCollapse(roots: TodoNode[], id: string) {
  const walk = (nodes: TodoNode[]): TodoNode[] =>
    nodes.map((n) => {
      if ((n as any).id === id) return { ...(n as any), collapsed: !((n as any).collapsed) } as TodoNode;

      const c = kids(n);
      if (!c.length) return n;

      return { ...(n as any), children: walk(c) } as TodoNode;
    });

  return walk(roots ?? []);
}

export function setCollapseAll(roots: TodoNode[], collapsed: boolean) {
  const walk = (nodes: TodoNode[]): TodoNode[] =>
    nodes.map((n) => {
      const c = kids(n);
      if (!c.length) return { ...(n as any), collapsed: !!(n as any).collapsed } as TodoNode;

      return {
        ...(n as any),
        collapsed,
        children: walk(c),
      } as TodoNode;
    });

  return walk(roots ?? []);
}

/** Toggle check:
 * - toggling a parent will toggle its whole subtree
 * - parents always re-sync checked based on children
 */
export function toggleCheck(roots: TodoNode[], id: string) {
  const setAll = (nodes: TodoNode[], checked: boolean): TodoNode[] => {
    return nodes.map((n) => {
      const c = kids(n);
      return {
        ...(n as any),
        checked,
        children: c.length ? setAll(c, checked) : [],
      } as TodoNode;
    });
  };

  const walk = (nodes: TodoNode[]): TodoNode[] => {
    return nodes.map((n) => {
      const c = kids(n);

      if ((n as any).id === id) {
        const nextChecked = !((n as any).checked);
        const nextKids = c.length ? setAll(c, nextChecked) : [];
        return { ...(n as any), checked: nextChecked, children: nextKids } as TodoNode;
      }

      if (!c.length) return n;

      const nextKids = walk(c);
      const checked = nextKids.length ? nextKids.every((x) => !!(x as any).checked) : !!(n as any).checked;
      return { ...(n as any), children: nextKids, checked } as TodoNode;
    });
  };

  return walk(roots ?? []);
}

/** Search filter: keep ancestry; if node matches, keep full subtree */
export function filterByQuery(roots: TodoNode[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return roots;

  const walk = (nodes: TodoNode[]): TodoNode[] => {
    const out: TodoNode[] = [];

    for (const n of nodes) {
      const title = String((n as any).title ?? "").toLowerCase();
      const c = kids(n);

      const selfMatch = title.includes(q);

      if (selfMatch) {
        out.push({ ...(n as any), collapsed: false, children: c } as TodoNode);
        continue;
      }

      if (!c.length) continue;

      const nextKids = walk(c);
      if (nextKids.length) {
        out.push({ ...(n as any), collapsed: false, children: nextKids } as TodoNode);
      }
    }

    return out;
  };

  return walk(roots ?? []);
}

/** Parse indented outline into a tree (2 spaces or tabs = depth) */
export function parseIndented(text: string, makeId: () => string): TodoNode[] {
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.replace(/\t/g, "  "))
    .filter((l) => l.trim().length > 0);

  const roots: TodoNode[] = [];
  const stack: { depth: number; node: TodoNode }[] = [];

  for (const raw of lines) {
    const indent = (raw.match(/^\s*/)?.[0] ?? "").length;
    const depth = Math.floor(indent / 2);
    const title = raw.trim();

    const node: TodoNode = {
      id: makeId(),
      title,
      checked: false,
      collapsed: false,
      children: [],
    } as any;

    while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop();

    if (!stack.length) {
      roots.push(node);
      stack.push({ depth, node });
      continue;
    }

    stack[stack.length - 1].node.children = [...kids(stack[stack.length - 1].node), node] as any;
    stack.push({ depth, node });
  }

  return normalizeTree(roots);
}

/** Simple sibling reorder (kept for compatibility) */
export function reorderSiblings(roots: TodoNode[], parentId: string | null, activeId: string, overId: string) {
  const reorderArray = (arr: TodoNode[]) => {
    const from = arr.findIndex((x) => (x as any).id === activeId);
    const to = arr.findIndex((x) => (x as any).id === overId);
    if (from < 0 || to < 0 || from === to) return arr;

    const next = [...arr];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    return next;
  };

  const walk = (nodes: TodoNode[], pid: string | null): TodoNode[] => {
    if (pid === parentId) return reorderArray(nodes);

    return nodes.map((n) => {
      const c = kids(n);
      if (!c.length) return n;
      return { ...(n as any), children: walk(c, (n as any).id) } as TodoNode;
    });
  };

  return walk(roots ?? [], null);
}
