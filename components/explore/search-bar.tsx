"use client";

import { useState, type FormEvent } from "react";

type SearchBarProps = {
  onSearch: (query: string) => void;
  disabled: boolean;
};

export function SearchBar({ onSearch, disabled }: SearchBarProps) {
  const [query, setQuery] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      return;
    }

    onSearch(trimmedQuery);
  }

  return (
    <form className="grid gap-3 md:grid-cols-[1fr_auto]" onSubmit={handleSubmit}>
      <input
        className="h-12 rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-4 text-sm text-[color:var(--text)] placeholder:text-[color:var(--muted)] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="곡 또는 아티스트 검색"
        type="search"
        value={query}
      />
      <button
        className="h-12 rounded-md bg-[color:var(--accent)] px-5 text-sm font-bold text-[color:var(--accent-contrast)] transition-colors hover:bg-[color:var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-55 md:min-w-28"
        disabled={disabled || !query.trim()}
        type="submit"
      >
        검색
      </button>
    </form>
  );
}
