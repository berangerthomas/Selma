import { RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { usePrintMarkdown } from '../hooks/usePrintMarkdown';

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
      className={`p-[6px] bg-transparent hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors flex items-center justify-center ${className}`}
      title={t('print.print')}
      aria-label={t('print.print')}
    >
      <span className="sr-only">{t('print.print')}</span>
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
  );
}