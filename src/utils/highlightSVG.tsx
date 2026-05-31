// TODO: used when SVG export search highlight is implemented
import { splitByHighlight } from './searchRegex';

export function HighlightSVGText({ text, query }: { text: string; query: string }) {
  if (!query || !text) return <>{text}</>
  const parts = splitByHighlight(text, query)
  return (
    <>
      {parts.map((part, i) =>
        part.isMatch ? (
          <tspan key={i} fill="#eab308" fontWeight="bold">
            {part.text}
          </tspan>
        ) : (
          <tspan key={i} fill="currentColor">
            {part.text}
          </tspan>
        )
      )}
    </>
  )
}
