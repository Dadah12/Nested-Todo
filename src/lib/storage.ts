import type { TodoNode } from "../types";

const KEY = "dang_nested_todo_v1";
const HEART_KEY = "dang_nested_todo_heart_v1";

export function loadTree(): TodoNode[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TodoNode[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function saveTree(tree: TodoNode[]) {
  localStorage.setItem(KEY, JSON.stringify(tree));
}

export function loadHeart(): boolean {
  try {
    const raw = localStorage.getItem(HEART_KEY);
    if (!raw) return false;
    return raw === "1";
  } catch {
    return false;
  }
}
export function saveHeart(on: boolean) {
  localStorage.setItem(HEART_KEY, on ? "1" : "0");
}

export function clearAll() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(HEART_KEY);
}
