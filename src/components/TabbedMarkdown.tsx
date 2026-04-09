import React, { useMemo, useState } from 'react';
import MarkdownRenderer from './MarkdownRenderer';

type PresentationMode = 'tabs' | 'linear';

interface TabbedMarkdownProps {
  content: string;
  className?: string;
  sanitize?: boolean;
  presentationMode?: PresentationMode;
  introClassName?: string;
  tabsWrapperClassName?: string;
}

export default function TabbedMarkdown({ content, className = '', sanitize = true, presentationMode = 'tabs', introClassName = 'mb-6', tabsWrapperClassName = '' }: TabbedMarkdownProps) {
  const [activeTab, setActiveTab] = useState(0);

  const { intro, tabs } = useMemo(() => {
    // Découper le contenu Markdown par les titres de niveau 2 (##)
    // Séparateur : une ligne commençant par "## "
    const parts = content.split(/^## /m);
    
    if (parts.length === 0) {
      return { intro: '', tabs: [] };
    }

    const intro = parts[0].trim();
    const tabs = parts.slice(1).map(part => {
      const firstNewlinePos = part.indexOf('\n');
      if (firstNewlinePos === -1) {
        // Le cas où il n'y a que le titre sans contenu
        return { title: part.trim(), content: '' };
      }
      return {
        title: part.substring(0, firstNewlinePos).trim(),
        // On rajoute les ## virtuels si l'utilisateur s'attendait à voir un h2 ? 
        // Non, dans un onglet on enlève le titre général "## Titre de l'onglet" car c'est redondant
        content: part.substring(firstNewlinePos + 1).trim()
      };
    });

    return { intro, tabs };
  }, [content]);

  // Réinitialiser l'onglet actif si on change de fichier et qu'il y a moins d'onglets
  const currentTab = activeTab >= tabs.length ? 0 : activeTab;

  if (presentationMode === 'linear') {
    return (
      <div className={`flex flex-col h-full`}>
        <MarkdownRenderer content={content} className={className} sanitize={sanitize} />
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full`}>
      {/* Intro (Niveau # et texte jusqu'au premier ##) */}
      {intro && (
        <div className={tabs.length > 0 ? introClassName : ''}>
          <MarkdownRenderer content={intro} className={className} sanitize={sanitize} />
        </div>
      )}

      {/* Onglets générés dynamiquement via les "##" */}
      {tabs.length > 0 && (
        <div className={`flex flex-col flex-1 ${tabsWrapperClassName}`}>
          <div 
            className="flex flex-wrap gap-2 mb-4 sticky top-0 z-10 py-2 border-b"
            style={{ 
              borderColor: 'var(--border-color)', 
              backgroundColor: 'transparent',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)'
            }}
          >
            {tabs.map((tab, idx) => (
              <button
                key={idx}
                onClick={() => setActiveTab(idx)}
                className={`px-3 py-1.5 text-[13px] rounded-[6px] transition-colors border-0 cursor-pointer ${
                  currentTab !== idx ? 'hover:bg-slate-200/50 dark:hover:bg-slate-700/50' : 'shadow-sm'
                }`}
                aria-pressed={currentTab === idx}
                style={
                  currentTab === idx
                    ? { backgroundColor: 'var(--btn-bg)', color: 'var(--btn-text)' }
                    : { backgroundColor: 'transparent', color: 'var(--text-muted)' }
                }
              >
                {tab.title}
              </button>
            ))}
          </div>

          <div className="flex-1 animate-in fade-in duration-300">
             <MarkdownRenderer
               content={tabs[currentTab]?.content || ''}
               className={className}
               sanitize={sanitize}
             />
          </div>
        </div>
      )}
    </div>
  );
}
