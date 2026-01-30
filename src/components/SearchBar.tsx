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
      // Cmd/Ctrl+K focuses search (nice premium)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="search">
      <Search size={18} className="searchIcon" />
      <input
        ref={ref}
        className="searchInput"
        placeholder="Search (Ctrl/Cmd+K)…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value.trim() ? (
        <button className="iconBtn ghost" onClick={onClear} aria-label="Clear search">
          <X size={18} />
        </button>
      ) : null}
    </div>
  );
}
