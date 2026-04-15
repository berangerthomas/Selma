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
  basePath?: string;
}

export default function TabbedMarkdown({ content, className = '', sanitize = true, presentationMode = 'tabs', introClassName = 'mb-6', tabsWrapperClassName = '', basePath }: TabbedMarkdownProps) {
  const [activeTab, setActiveTab] = useState(0);

  const tabTextStyles = className.includes('prose-sm') ? 'text-[12px] px-2.5 py-1' :
                        className.includes('prose-lg') ? 'text-[15px] px-3.5 py-2' :
                        className.includes('prose-xl') ? 'text-[17px] px-4 py-2.5' :
                        className.includes('prose-2xl') ? 'text-[20px] px-5 py-3' :
                        'text-[13px] px-3 py-1.5';

  const { intro, tabs } = useMemo(() => {
    // Split the Markdown content by level-2 headings (##)
    // Separator: a line starting with "## "
    const parts = content.split(/^## /m);
    
    if (parts.length === 0) {
      return { intro: '', tabs: [] };
    }

    const intro = parts[0].trim();
    const tabs = parts.slice(1).map(part => {
      const firstNewlinePos = part.indexOf('\n');
      if (firstNewlinePos === -1) {
        // Case where there is only a title without content
        return { title: part.trim(), content: '' };
      }
      return {
        title: part.substring(0, firstNewlinePos).trim(),
        // Consider adding virtual ## if the user expected an h2?
        // No: in a tab we remove the general "## Tab title" because it's redundant
        content: part.substring(firstNewlinePos + 1).trim()
      };
    });

    return { intro, tabs };
  }, [content]);

  // Reset the active tab if we change files and there are fewer tabs
  const currentTab = activeTab >= tabs.length ? 0 : activeTab;

  if (presentationMode === 'linear') {
    return (
      <div className={`flex flex-col h-full`}>
        <MarkdownRenderer content={content} className={className} sanitize={sanitize} basePath={basePath} />
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full`}>
      {/* Intro (heading level and text up to the first ##) */}
      {intro && (
        <div className={tabs.length > 0 ? introClassName : ''}>
          <MarkdownRenderer content={intro} className={className} sanitize={sanitize} basePath={basePath} />
        </div>
      )}

      {/* Tabs generated dynamically from "##" */}
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
                className={`${tabTextStyles} rounded-[6px] transition-colors border-0 cursor-pointer ${
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
               basePath={basePath}
             />
          </div>
        </div>
      )}
    </div>
  );
}
