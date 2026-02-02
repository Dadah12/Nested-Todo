import React from "react";

export default function Tabs({
  tab,
  onTab,
  todoCount,
  doneCount,
}: {
  tab: "todo" | "done";
  onTab: (t: "todo" | "done") => void;
  todoCount: number;
  doneCount: number;
}) {
  return (
    <div className="tabs">
      <button className={`tabPill ${tab === "todo" ? "active" : ""}`} onClick={() => onTab("todo")} type="button">
        Todo <span className="badge">{todoCount}</span>
      </button>
      <button className={`tabPill ${tab === "done" ? "active" : ""}`} onClick={() => onTab("done")} type="button">
        Done <span className="badge">{doneCount}</span>
      </button>
    </div>
  );
}
