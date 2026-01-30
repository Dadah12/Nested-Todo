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
      <button className={`tab ${tab === "todo" ? "active" : ""}`} onClick={() => onTab("todo")}>
        Todo <span className="pill">{todoCount}</span>
      </button>
      <button className={`tab ${tab === "done" ? "active" : ""}`} onClick={() => onTab("done")}>
        Done <span className="pill">{doneCount}</span>
      </button>
    </div>
  );
}
