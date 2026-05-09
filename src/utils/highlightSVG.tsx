// highlight SVG functions
import { buildHighlightRegex } from './searchRegex';

export function HighlightSVGText({ text, query }: { text: string; query: string }) {
  if (!query || !text) return <>{text}</>
  const parts = text.split(buildHighlightRegex(query))
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <tspan key={i} fill="#eab308" fontWeight="bold">
            {part}
          </tspan>
        ) : (
          <tspan key={i} fill="currentColor">
            {part}
          </tspan>
        )
      )}
    </>
  )
}
