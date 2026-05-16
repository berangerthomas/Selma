// highlight functions
import { splitByHighlight } from './searchRegex';

export function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query || !text) return <>{text}</>
  const parts = splitByHighlight(text, query)
  return (
    <>
      {parts.map((part, i) =>
        part.isMatch ? (
          <mark key={i} className="search-highlight bg-yellow-300 dark:bg-yellow-600/50 text-black dark:text-white rounded-sm px-0.5">
            {part.text}
          </mark>
        ) : (
          part.text
        )
      )}
    </>
  )
}
