import { RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { usePrintMarkdown } from '../hooks/usePrintMarkdown';
import PrintIcon from '../assets/icons/print.svg?react';

interface PrintMarkdownButtonProps {
  contentRef: RefObject<HTMLElement | null>;
  title?: string;
  className?: string;
}

export function PrintMarkdownButton({ contentRef, title, className = '' }: PrintMarkdownButtonProps) {
  const { t } = useTranslation('ui');
  const { printContent } = usePrintMarkdown(contentRef);

  return (
    <button
      onClick={() => printContent(title)}
      className={`p-[6px] cursor-pointer bg-transparent hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors flex items-center justify-center ${className}`}
      title={t('print.print', { defaultValue: 'Print' })}
      aria-label={t('print.print', { defaultValue: 'Print' })}
    >
      <span className="sr-only">{t('print.print', { defaultValue: 'Print' })}</span>
      <PrintIcon className="w-[18px] h-[18px]" />
    </button>
  );
}