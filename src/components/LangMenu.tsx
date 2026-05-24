export interface LangMenuProps {
  lang: string;
  supportedLanguages: readonly string[];
  onSelect: (lang: string) => void;
  buttonClassName?: string;
}

export default function LangMenu({ lang = '', supportedLanguages = [], onSelect = () => {}, buttonClassName }: LangMenuProps) {
  return (
    <div className="relative group/lang-menu flex items-center h-[30px]" onMouseDown={(e) => e.stopPropagation()}>
      <button
        className={buttonClassName || "p-[6px] bg-transparent hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors h-full"}
        title="Change Language"
        aria-label="Change Language"
        onMouseDown={(e) => e.stopPropagation()}
        style={{ fontSize: '13px', fontWeight: 'bold', width: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'inherit', border: 'none', cursor: 'pointer' }}
      >
        {(lang || '').toUpperCase()}
      </button>

      <div
        className="absolute top-full right-0 pt-1 z-50 opacity-0 pointer-events-none translate-y-1 transition-all duration-150 group-hover/lang-menu:opacity-100 group-hover/lang-menu:pointer-events-auto group-hover/lang-menu:translate-y-0 group-focus-within/lang-menu:opacity-100 group-focus-within/lang-menu:pointer-events-auto group-focus-within/lang-menu:translate-y-0"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="py-1 min-w-[50px] bg-[var(--panel-bg)] border border-[var(--border-color)] shadow-[0_4px_12px_var(--toolbar-shadow)] rounded-md flex flex-col backdrop-blur-md">
          {(supportedLanguages || []).map(l => (
            <button
              key={l}
              onClick={() => onSelect(l)}
              className={`w-full py-1.5 px-3 text-[13px] font-bold bg-transparent border-none cursor-pointer transition-colors
                ${l === lang
                  ? 'text-blue-500 dark:text-blue-400'
                  : 'text-[var(--text-muted)] hover:text-blue-500 dark:hover:text-blue-400'
                }`}
            >
              {(l || '').toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}