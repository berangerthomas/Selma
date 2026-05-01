// highlight SVG functions

export function HighlightSVGText({ text, query }: { text: string; query: string }) {
  if (!query || !text) return <>{text}</>
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
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
