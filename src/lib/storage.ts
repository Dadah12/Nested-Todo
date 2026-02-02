import type { TodoNode } from "../types";

const KEY = "nested_todo_state_v1";

export type StoredState = {
  roots: TodoNode[];
};

export function loadState(): StoredState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredState;
    if (!parsed?.roots) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveState(state: StoredState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors (private mode, blocked storage, etc.)
  }
}
