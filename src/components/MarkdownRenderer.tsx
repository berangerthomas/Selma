import React, { useEffect, useState } from 'react';
import { visit } from 'unist-util-visit';
import 'react-medium-image-zoom/dist/styles.css';
import Zoom from 'react-medium-image-zoom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeSanitize from 'rehype-sanitize';
import { defaultSchema } from 'hast-util-sanitize';

// Extend the default rehype-sanitize schema to allow KaTeX and Highlight.js classes
const katexSanitizeSchema = (() => {
  const base: any = defaultSchema || {};
  const tagNames = Array.isArray(base.tagNames) ? [...base.tagNames] : [];
  const extras = ['mark', 'math', 'semantics', 'annotation', 'mrow', 'mi', 'mn', 'mo', 'msup', 'msub', 'msubsup', 'mfrac', 'msqrt', 'mstyle', 'mtext', 'mtable', 'mtr', 'mtd', 'munder', 'mover', 'munderover'];

  for (const t of extras) {
    if (!tagNames.includes(t)) {
      tagNames.push(t);
    }
  }

  const attributes = { ...(base.attributes || {}) };
  // Ensure span/div and code/pre keep class/style for KaTeX and syntax highlighting
  const keepClassAndStyle = ['className', 'class', 'style'];
  attributes.mark = Array.from(new Set([...(attributes.mark || []), ...keepClassAndStyle]));
  attributes.span = Array.from(new Set([...(attributes.span || []), ...keepClassAndStyle]));
  attributes.div = Array.from(new Set([...(attributes.div || []), ...keepClassAndStyle]));
  attributes.code = Array.from(new Set([...(attributes.code || []), ...keepClassAndStyle]));
  attributes.pre = Array.from(new Set([...(attributes.pre || []), ...keepClassAndStyle]));
  attributes.annotation = Array.from(new Set([...(attributes.annotation || []), 'encoding']));
  attributes.math = Array.from(new Set([...(attributes.math || []), 'xmlns']));
  attributes.img = Array.from(new Set([...(attributes.img || []), 'src', 'alt', 'title', 'width', 'height']));

  return {
    ...base,
    tagNames,
    attributes
  };
})();

function rehypeSearchHighlight(options: { query?: string }) {
  return (tree: any) => {
    if (!options.query) return;
    const queryStr = options.query.trim();
    if (!queryStr) return;
    const regex = new RegExp(`(${queryStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    visit(tree, 'text', (node, index, parent) => {
      if (!parent || parent.tagName === 'code' || parent.tagName === 'pre' || parent.tagName === 'math' || parent.tagName === 'script' || parent.tagName === 'style' || parent.tagName === 'mark') {
        return;
      }
      if (typeof node.value !== 'string') return;
      if (!node.value.match(regex)) return;
      
      const parts = node.value.split(regex);
      const newNodes = parts.map((part: string, i: number) => {
        if (part.toLowerCase() === queryStr.toLowerCase()) {
          return { type: 'element', tagName: 'mark', properties: { className: ['search-highlight', 'bg-yellow-300', 'dark:bg-yellow-600/50', 'text-black', 'dark:text-white'] }, children: [{ type: 'text', value: part }] };
        }
        return { type: 'text', value: part };
      }).filter((n: any) => n.value !== '' || n.type === 'element');
      
      parent.children.splice(index as number, 1, ...newNodes);
      return (index as number) + newNodes.length; // skip added nodes
    });
  };
}

interface MarkdownRendererProps {
  content: string;
  className?: string;
  sanitize?: boolean;
  basePath?: string;
  searchQuery?: string;
}

export default function MarkdownRenderer({ content, className = '', sanitize = true, basePath, searchQuery }: MarkdownRendererProps) {
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
    if (searchQuery) {
      rehypePlugins.push([rehypeSearchHighlight, { query: searchQuery }]);
    }
    if (sanitize) {
      rehypePlugins.push([rehypeSanitize, katexSanitizeSchema]);
    }
    
    // Custom components to intercept img and fix relative paths
    const components = {
      img: (props: any) => {
        let src = props.src;
        if (src && basePath && !src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('//') && !src.startsWith('/')) {
            // If the src is relative, resolve it against the basePath
            // basePath is expected as a file path, e.g. /details/en/mammals.md
            // we use the directory portion, e.g. /details/en/
          const dir = basePath.substring(0, basePath.lastIndexOf('/') + 1);
          src = dir + src;
        }
        return (
          <Zoom>
            <img {...props} src={src} className="cursor-pointer" />
          </Zoom>
        );
      }
    };

  return (
    <div className={`prose prose-slate dark:prose-invert ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={rehypePlugins}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
