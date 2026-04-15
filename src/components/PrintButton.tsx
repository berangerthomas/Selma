import React, { useState, useRef, useEffect, RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { usePrintSVG } from '../hooks/usePrintSVG';
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  safePolygon
} from '@floating-ui/react';

interface PrintAndExportButtonsProps {
  svgRef: RefObject<SVGSVGElement | null>;
  title?: string;
  className?: string; // Kept for backwards compatibility if needed
}

export function PrintAndExportButtons({ svgRef, title, className = '' }: PrintAndExportButtonsProps) {
  const { t } = useTranslation('ui');
  const effectiveTitle = title || t('export_default_title', { defaultValue: 'Selma — Taxonomy' });
  const [isOpen, setOpen] = useState(false);
  const [loadingType, setLoadingType] = useState<string | null>(null);

  const { printSVG, downloadSVG, downloadPNG, downloadJPG } = usePrintSVG(svgRef);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setOpen,
    placement: 'bottom-start',
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(4),
      flip({ fallbackAxisSideDirection: 'end' }),
      shift({ padding: 8 })
    ]
  });

  const hover = useHover(context, { handleClose: safePolygon() });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'menu' });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role
  ]);

  const handlePrint = () => {
    setOpen(false);
    printSVG(effectiveTitle);
  };

  const handleAction = async (type: string, action: () => Promise<void> | void) => {
    if (loadingType) return;
    setLoadingType(type);
    try {
      await action();
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingType(null);
      setOpen(false);
    }
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* Print button (separate) */}
      <button
        onClick={handlePrint}
        className="p-[6px] bg-transparent hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors"
        title={t('print.print')}
        aria-label={t('print.print')}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-[18px] h-[18px]"
        >
          <polyline points="6 9 6 2 18 2 18 9" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <rect x="6" y="14" width="12" height="8" />
        </svg>
      </button>

      {/* Export button (with dropdown menu configured by Floating UI) */}
      <div className="relative inline-block">
        <button
          ref={refs.setReference}
          {...getReferenceProps()}
          className="p-[6px] bg-transparent hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors"
          title={t('print.export', { defaultValue: 'Export' })}
          aria-label={t('print.export', { defaultValue: 'Export' })}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-[18px] h-[18px]"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>

        {isOpen && (
          <div 
            ref={refs.setFloating}
            style={{ ...floatingStyles, zIndex: 1000 }}
            {...getFloatingProps()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="min-w-[220px] bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 text-sm overflow-hidden py-1">
              <button
                onClick={() => handleAction('svg', () => downloadSVG(effectiveTitle ? `${effectiveTitle}.svg` : 'export.svg'))}
                className="w-full text-left px-4 py-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-3 transition-colors"
                disabled={!!loadingType}
              >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0 text-neutral-500">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
              <span>{t('print.download_svg')}</span>
            </button>
              <button
              onClick={() => handleAction('png', () => downloadPNG(effectiveTitle ? `${effectiveTitle}.png` : 'export.png'))}
              className="w-full text-left px-4 py-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-3 transition-colors"
              disabled={!!loadingType}
            >
              {loadingType === 'png' ? (
                <span className="w-4 h-4 shrink-0 block border-2 border-neutral-500 border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0 text-neutral-500">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              )}
              <span className={loadingType === 'png' ? 'text-neutral-400' : ''}>
                {loadingType === 'png' ? t('print.loading') : t('print.download_png')}
              </span>
            </button>
              <button
              onClick={() => handleAction('jpg', () => downloadJPG(effectiveTitle ? `${effectiveTitle}.jpg` : 'export.jpg'))}
              className="w-full text-left px-4 py-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-3 transition-colors"
              disabled={!!loadingType}
            >
              {loadingType === 'jpg' ? (
                <span className="w-4 h-4 shrink-0 block border-2 border-neutral-500 border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0 text-neutral-500">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              )}
              <span className={loadingType === 'jpg' ? 'text-neutral-400' : ''}>
                {loadingType === 'jpg' ? t('print.loading') : t('print.download_jpg')}
              </span>
            </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}