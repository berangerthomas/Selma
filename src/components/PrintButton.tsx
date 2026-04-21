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
import ImageIcon from '../assets/icons/image.svg?react';
import PrintIcon from '../assets/icons/print.svg?react';
import DownloadIcon from '../assets/icons/download.svg?react';
import CodeIcon from '../assets/icons/code.svg?react';

interface PrintAndExportButtonsProps {
  svgRef: RefObject<SVGSVGElement | null>;
  title?: string;
  className?: string; // Kept for backwards compatibility if needed
}

function ExportImageButton({
  type, label, loadingType, disabled, onClick, t
}: { type: string; label: string; loadingType: string | null; disabled: boolean; onClick: () => void; t: any }) {
  const isLoading = loadingType === type
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${disabled ? 'cursor-default opacity-50' : 'cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
      disabled={disabled}
    >
      {isLoading ? (
        <span className="w-4 h-4 shrink-0 block border-2 border-neutral-500 border-t-transparent rounded-full animate-spin"></span>
      ) : (
        <ImageIcon className="w-4 h-4 shrink-0 text-neutral-500" />
      )}
      <span className={isLoading ? 'text-neutral-400' : ''}>
        {isLoading ? t('print.loading') : label}
      </span>
    </button>
  )
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
        className="p-[6px] cursor-pointer bg-transparent hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors"
        title={t('print.print', { defaultValue: 'Print' })}
        aria-label={t('print.print', { defaultValue: 'Print' })}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <PrintIcon className="w-[18px] h-[18px]" />
      </button>

      {/* Export button (with dropdown menu configured by Floating UI) */}
      <div className="relative inline-block">
        <button
          ref={refs.setReference}
          {...getReferenceProps()}
          className="p-[6px] cursor-pointer bg-transparent hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors"
          title={t('print.export', { defaultValue: 'Export' })}
          aria-label={t('print.export', { defaultValue: 'Export' })}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <DownloadIcon className="w-[18px] h-[18px]" />
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
                className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${!!loadingType ? 'cursor-default opacity-50' : 'cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
                disabled={!!loadingType}
              >
              <CodeIcon className="w-4 h-4 shrink-0 text-neutral-500" />
              <span>{t('print.download_svg', { defaultValue: 'Download SVG' })}</span>
            </button>
            <ExportImageButton
              type="png"
              label={t('print.download_png', { defaultValue: 'Download PNG' })}
              loadingType={loadingType}
              disabled={!!loadingType}
              onClick={() => handleAction('png', () => downloadPNG(effectiveTitle ? `${effectiveTitle}.png` : 'export.png'))}
              t={t}
            />
            <ExportImageButton
              type="jpg"
              label={t('print.download_jpg', { defaultValue: 'Download JPG' })}
              loadingType={loadingType}
              disabled={!!loadingType}
              onClick={() => handleAction('jpg', () => downloadJPG(effectiveTitle ? `${effectiveTitle}.jpg` : 'export.jpg'))}
              t={t}
            />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}