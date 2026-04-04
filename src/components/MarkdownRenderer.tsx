import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeSanitize from 'rehype-sanitize';
import { defaultSchema } from 'hast-util-sanitize';

// Extend the default rehype-sanitize schema to allow KaTeX and Highlight.js classes
const katexSanitizeSchema = (() => {
  const base: any = defaultSchema || {};
  const tagNames = Array.isArray(base.tagNames) ? [...base.tagNames] : [];
  const extras = ['math', 'semantics', 'annotation', 'mrow', 'mi', 'mn', 'mo', 'msup', 'msub', 'msubsup', 'mfrac', 'msqrt', 'mstyle', 'mtext', 'mtable', 'mtr', 'mtd', 'munder', 'mover', 'munderover'];
  
  for (const t of extras) {
    if (!tagNames.includes(t)) {
      tagNames.push(t);
    }
  }

  const attributes = { ...(base.attributes || {}) };
  // Ensure span/div and code/pre keep class/style for KaTeX and syntax highlighting
  const keepClassAndStyle = ['className', 'class', 'style'];
  attributes.span = Array.from(new Set([...(attributes.span || []), ...keepClassAndStyle]));
  attributes.div = Array.from(new Set([...(attributes.div || []), ...keepClassAndStyle]));
  attributes.code = Array.from(new Set([...(attributes.code || []), ...keepClassAndStyle]));
  attributes.pre = Array.from(new Set([...(attributes.pre || []), ...keepClassAndStyle]));
  attributes.annotation = Array.from(new Set([...(attributes.annotation || []), 'encoding']));
  attributes.math = Array.from(new Set([...(attributes.math || []), 'xmlns']));

  return {
    ...base,
    tagNames,
    attributes
  };
})();

interface MarkdownRendererProps {
  content: string;
  className?: string;
  sanitize?: boolean;
}

export default function MarkdownRenderer({ content, className = '', sanitize = true }: MarkdownRendererProps) {
    // We'll dynamically load heavy rehype plugins (katex, highlight) on mount
    const [extraRehypePlugins, setExtraRehypePlugins] = useState<any[]>([]);

    useEffect(() => {
      let mounted = true;
      (async () => {
        try {
          const imports = await Promise.all([
            import('rehype-katex'),
            import('rehype-highlight'),
            import('katex/dist/katex.min.css'),
            import('highlight.js/styles/github.css')
          ]);
          const rehypeKatex = imports[0].default || imports[0];
          const rehypeHighlight = imports[1].default || imports[1];
          if (mounted) setExtraRehypePlugins([rehypeKatex, rehypeHighlight]);
        } catch (err) {
          // non-fatal: we can still render without these plugins
          console.warn('Could not load optional rehype plugins', err);
        }
      })();

      return () => { mounted = false };
    }, []);

    const rehypePlugins: any[] = [...extraRehypePlugins];
    if (sanitize) {
      rehypePlugins.push([rehypeSanitize, katexSanitizeSchema]);
    }

  return (
    <div className={`prose prose-slate ${className}`}>      
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={rehypePlugins}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
