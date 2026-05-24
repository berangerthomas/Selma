import type { Orientation } from '../types'

export function computeAutoLayout(
  labels: string[],
  orientation: Orientation
): { nodeSize: number; hSpacing: number; vSpacing: number } {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return { nodeSize: 18, hSpacing: 220, vSpacing: 80 }
  }

  const baseFont = 14
  ctx.font = `${baseFont}px sans-serif`
  let maxTextWidth = 0
  const widths: number[] = []
  for (const l of labels) {
    const w = ctx.measureText(l).width
    widths.push(w)
    if (w > maxTextWidth) maxTextWidth = w
  }
  const avgWidth = widths.length ? widths.reduce((a, b) => a + b, 0) / widths.length : 0
  const labelCount = labels.length
  const baseNodeSize = 18
  const scaleFactor = Math.min(1.6, Math.max(0.8, maxTextWidth / 80))
  const idealNodeSize = Math.round(Math.max(12, Math.min(50, baseNodeSize * scaleFactor)))
  const comfortMargin = Math.max(40, Math.min(100, Math.round(avgWidth * 0.5)))
  const depthSpacing = Math.max(80, Math.min(400, Math.round(maxTextWidth + idealNodeSize + comfortMargin)))
  const densityFactor = Math.max(0.6, Math.min(1.4, 20 / Math.max(1, Math.log(labelCount + 1) * 4)))
  const orthogonalSpacing = Math.max(12, Math.min(200, Math.round((idealNodeSize * 1.2 + 10) * densityFactor)))
  const finalH = orientation === 'horizontal' ? depthSpacing : orthogonalSpacing
  const finalV = orientation === 'horizontal' ? orthogonalSpacing : depthSpacing

  return { nodeSize: idealNodeSize, hSpacing: finalH, vSpacing: finalV }
}
