import React from "react";
import { CheckCircle2, ListTodo } from "lucide-react";

export default function EmptyState({ kind }: { kind: "todo" | "done" }) {
  const Icon = kind === "todo" ? ListTodo : CheckCircle2;
  const title = kind === "todo" ? "No tasks yet" : "Nothing done yet";
  const desc =
    kind === "todo"
      ? "Add a task above, or use Quick Add to paste a nested checklist."
      : "Done groups appear here only when a task has subtasks AND all of them are complete.";
  return (
    <div className="empty">
      <Icon size={28} />
      <div>
        <div className="emptyTitle">{title}</div>
        <div className="emptyDesc">{desc}</div>
      </div>
    </div>
  );
}
