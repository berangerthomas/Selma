import { RefObject } from 'react';

export function usePrintHTML(htmlRef: RefObject<HTMLDivElement | null>, landscape: boolean = false) {
  const printHTML = (title: string = 'Document') => {
    if (!htmlRef.current) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Pop-up blocked. Please allow pop-ups to print.");
      return;
    }

    // Gather all stylesheet links and inline styles from the current document
    const stylesheets: string[] = [];
    
    // Inline <style> tags
    document.querySelectorAll('style').forEach((style) => {
      stylesheets.push(style.outerHTML);
    });
    
    // Linked stylesheets
    document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
      stylesheets.push((link as HTMLLinkElement).outerHTML);
    });

    // Detect theme
    const isDark = document.documentElement.classList.contains('dark');
    const bodyClass = isDark ? 'dark' : '';
    
    // Clone the content
    const content = htmlRef.current.innerHTML;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html class="${bodyClass}">
        <head>
          <title>${title}</title>
          ${stylesheets.join('\n')}
          <style>
            @media print {
              @page { margin: 10mm; ${landscape ? 'size: landscape;' : ''} }
              body { 
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact; 
                padding: 0 !important; 
                background: white !important;
                color: #111827 !important;
              }
              /* Hide sidebar and interactive elements */
              .sidebar, [class*="sidebar"], [class*="Sidebar"] { display: none !important; }
              /* Ensure backgrounds print */
              * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              padding: 1rem;
            }
            /* Dark theme override for print window */
            html.dark body {
              background: #1e1e1e;
              color: #e5e7eb;
            }
          </style>
        </head>
        <body>
          ${content}
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
              }, 500);
            };
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return { printHTML };
}
