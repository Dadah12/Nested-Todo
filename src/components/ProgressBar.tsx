import React from "react";

export default function ProgressBar({
  done,
  total,
  label,
}: {
  done: number;
  total: number;
  label?: string;
}) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="progressWrap">
      <div className="progressTop">
        <div className="progressLabel">{label ?? "Progress"}</div>
        <div className="progressMeta">
          {done}/{total} ({pct}%)
        </div>
      </div>
      <div className="progressBar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="progressFill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
