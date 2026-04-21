import React from 'react'

export function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query || !text) return <>{text}</>
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="search-highlight bg-yellow-300 dark:bg-yellow-600/50 text-black dark:text-white rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  )
}