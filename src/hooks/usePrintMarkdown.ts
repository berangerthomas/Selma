import { RefObject } from 'react';

export function usePrintMarkdown(contentRef: RefObject<HTMLElement | null>) {
  const printContent = (title: string = 'Document') => {
    if (!contentRef.current) return;
    const htmlContent = contentRef.current.innerHTML;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Pop-up blocked. Please allow pop-ups to print.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
          <style>
            :root {
              --btn-bg: #0f172a;
              --btn-text: #fff;
              --text-muted: #374151;
              --border-color: rgba(0,0,0,0.06);
            }
            @media print {
              @page { margin: 20mm; }
              body { 
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact; 
                padding: 0 !important; 
                background: white !important;
              }
              pre, blockquote, tr, img { page-break-inside: avoid; }
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              max-width: 65ch;
              margin: 0 auto;
              padding: 2rem 1rem;
              color: #111827;
            }
          </style>
        </head>
        <body>
          ${htmlContent}
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
              }, 800); // Give CDN and external stylesheets time to process/load
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return { printContent };
}
