import React from "react";

export default function EmptyState({ kind }: { kind: "todo" | "done" }) {
  return (
    <div className="empty">
      <div className="emptyTitle">{kind === "todo" ? "No tasks yet" : "No done tasks yet"}</div>
      <div className="emptySub">
        {kind === "todo"
          ? "Type a task and press Enter, or upload a CSV to import your list."
          : "When you complete tasks, they’ll appear here."}
      </div>
    </div>
  );
}
