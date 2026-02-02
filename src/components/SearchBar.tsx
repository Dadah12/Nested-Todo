import React, { useEffect, useRef } from "react";
import { Search, X } from "lucide-react";

export default function SearchBar({
  value,
  onChange,
  onClear,
}: {
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
}) {
  const ref = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isK = e.key.toLowerCase() === "k";
      if ((e.ctrlKey || e.metaKey) && isK) {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="searchWrap">
      <Search size={16} className="searchIcon" />
      <input
        ref={ref}
        className="searchInput"
        placeholder="Search (Ctrl/Cmd+K)…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value.trim() ? (
        <button className="searchClear" type="button" onClick={onClear} aria-label="Clear search">
          <X size={16} />
        </button>
      ) : null}
    </div>
  );
}
