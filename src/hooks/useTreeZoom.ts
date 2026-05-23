import { useRef, useLayoutEffect, useCallback } from 'react';
import type { RefObject } from 'react';
import * as d3 from 'd3';

export function computeBounds(
  ids: Iterable<string>,
  positions: Map<string, { x: number; y: number }>
): { minX: number; maxX: number; minY: number; maxY: number; count: number } | null {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, count = 0;
  for (const id of ids) {
    const p = positions.get(id);
    if (!p) continue;
    count++;
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return count > 0 ? { minX, maxX, minY, maxY, count } : null;
}

export const ANIMATION_MS = 1000;
export const OPACITY_MS = Math.round(ANIMATION_MS / 2);
export const NODE_TRANSITION = `transform ${ANIMATION_MS}ms cubic-bezier(.2,.8,.2,1)`;
const NODE_CENTER_RATIO = 0.5;
export const CENTER_MARGIN = 120;

export function computeTransform(
  nodePos: { x: number; y: number },
  subtreeExtents: { minX: number; maxX: number; minY: number; maxY: number } | null,
  svgRect: DOMRect | { width: number; height: number },
  sidebarOffset: number,
  forcedScale?: number,
  layoutParams?: { hSpacing: number; nodeSize: number },
  orientation?: 'horizontal' | 'vertical'
): d3.ZoomTransform {
  const topOcclusion = 30; // Toolbar on top
  const bottomOcclusion = 40; // Breadcrumb on bottom
  const leftOcclusion = 20;
  const rightOcclusion = 20;

  const effectiveWidth = Math.max(10, svgRect.width - sidebarOffset - leftOcclusion - rightOcclusion);
  const availableHeight = Math.max(10, svgRect.height - topOcclusion - bottomOcclusion);

  let targetScale = forcedScale || 1;

  // In horizontal mode: d3.y = depth (screen X), d3.x = vertical (screen Y)
  // In vertical mode:   d3.x = depth (screen X), d3.y = horizontal (screen Y)
  // So we map depth → screenX coord, orthogonal → screenY coord
  const depthPos = orientation === 'vertical' ? nodePos.x : nodePos.y
  const orthoPos = orientation === 'vertical' ? nodePos.y : nodePos.x

  if (subtreeExtents && !forcedScale) {
    const visualMinY = orientation === 'vertical' ? subtreeExtents.minX - 40 : subtreeExtents.minY - 40;
    const labelMarginRight = layoutParams ? Math.round(layoutParams.hSpacing * 1.6) : 350;
    const labelMarginBottom = layoutParams ? Math.round(layoutParams.nodeSize * 5) : 140;
    const visualMaxY = orientation === 'vertical' ? subtreeExtents.maxX + labelMarginRight : subtreeExtents.maxY + labelMarginRight;
    const visualMinX = orientation === 'vertical' ? subtreeExtents.minY - 30 : subtreeExtents.minX - 30;
    const visualMaxX = orientation === 'vertical' ? subtreeExtents.maxY + labelMarginBottom : subtreeExtents.maxX + labelMarginBottom;

    const treeWidth = Math.max(1, visualMaxY - visualMinY);
    const treeHeight = Math.max(1, visualMaxX - visualMinX);

    const scaleX = effectiveWidth / treeWidth;
    const scaleY = availableHeight / treeHeight;

    const proposed = Math.min(scaleX, scaleY);
    const MIN_SCALE = 0.05;
    const MAX_SCALE = 1.3;
    targetScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, proposed));

    const tx = leftOcclusion + (effectiveWidth - treeWidth * targetScale) / 2 - visualMinY * targetScale;
    const ty = topOcclusion + (availableHeight - treeHeight * targetScale) / 2 - visualMinX * targetScale;

    return d3.zoomIdentity.translate(tx, ty).scale(targetScale);
  }

  const tx = leftOcclusion + effectiveWidth * NODE_CENTER_RATIO - depthPos * targetScale;
  const ty = topOcclusion + availableHeight / 2 - orthoPos * targetScale;

  return d3.zoomIdentity.translate(tx, ty).scale(targetScale);
}

export function useTreeZoom(
  svgRef: RefObject<SVGSVGElement | null>,
  innerGroupRef: RefObject<SVGGElement | null>
) {
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  useLayoutEffect(() => {
    if (!svgRef.current || !innerGroupRef.current) return;
    const svg = d3.select(svgRef.current);
    const inner = d3.select(innerGroupRef.current);

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.05, 4])
      // Filter prevents panning when interacting with inputs
      .filter((event) => {
        if (event.type === 'wheel') return !event.ctrlKey;
        if (event.type === 'pointerdown') {
          const target = event.target as HTMLElement;
          if (target && ['INPUT', 'TEXTAREA', 'BUTTON', 'A', 'SELECT', 'OPTION'].includes(target.tagName)) return false;
        }
        return true;
      })
      .on('zoom', (event) => {
        inner.attr('transform', event.transform.toString());
      });

    zoomRef.current = zoom;
    svg.call(zoom);

    return () => {
      svg.on('.zoom', null);
    };
  }, [svgRef, innerGroupRef]);

  const applyTransform = useCallback((t: d3.ZoomTransform, immediate = false) => {
    if (!svgRef.current || !zoomRef.current) return;
    const svg = d3.select(svgRef.current);
    if (immediate) {
      svg.call(zoomRef.current.transform, t);
    } else {
      svg.transition()
        .duration(ANIMATION_MS)
        .delay(0)
        .ease(d3.easeCubicOut)
        .call(zoomRef.current.transform, t);
    }
  }, [svgRef]);

  return { zoomRef, applyTransform };
}
