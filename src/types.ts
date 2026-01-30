// src/types.ts
// Single source of truth: TodoNode comes from the tree helpers.
export type { TodoNode } from "./lib/tree";

/**
 * Match sa flattenForExport() output natin sa tree.ts
 */
export type ExportRow = {
  rootTitle: string;
  fullPath: string;
  title: string;
  checked: "YES" | "NO";
  isDoneGroup: "YES" | "NO";
};
