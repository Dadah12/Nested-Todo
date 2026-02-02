import React from "react";

export default function ProgressBar({
  done,
  total,
  label,
}: {
  done: number;
  total: number;
  label: string;
}) {
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="progressWrap">
      <div className="progressTop">
        <span className="progressLabel">{label}</span>
        <span className="progressMeta">
          {done}/{total} ({pct}%)
        </span>
      </div>
      <div className="progressBar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="progressFill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
