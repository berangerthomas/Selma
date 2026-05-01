import { RefObject } from 'react';

async function embedFontInSVG(svgString: string): Promise<string> {
  try {
    let combinedCssText = '';
    
    // Find all font-related stylesheets in the document
    const links = document.querySelectorAll('link[rel="stylesheet"]');
    for (const link of Array.from(links)) {
      const href = (link as HTMLLinkElement).href;
      // You can adjust these conditions depending on which styles you want to embed.
      // E.g. targeting Google Fonts and a specific 'fonts/' local folder.
      if (href.includes('fonts.googleapis.com') || href.includes('fonts/')) {
        try {
          const response = await fetch(href);
          let cssText = await response.text();

          const urlRegex = /url\((?:['"]?)(.*?)(?:['"]?)\)/g;
          let match;
          const fetchPromises: Promise<string>[] = [];
          const urlsToReplace: { originalMatch: string, fontUrl: string }[] = [];

          while ((match = urlRegex.exec(cssText)) !== null) {
            const relativeUrl = match[1];
            // Skip data URIs
            if (relativeUrl.startsWith('data:')) continue;
            
            const fontUrl = new URL(relativeUrl, href).href;
            urlsToReplace.push({ originalMatch: match[0], fontUrl });
            
            fetchPromises.push(
              fetch(fontUrl)
                .then(res => res.blob())
                .then(blob => new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.readAsDataURL(blob);
                }))
                .catch(() => '') // return empty on fail to skip replacing
            );
          }

          const base64Strings = await Promise.all(fetchPromises);
          urlsToReplace.forEach((item, index) => {
            if (base64Strings[index]) {
              cssText = cssText.replace(item.originalMatch, `url("${base64Strings[index]}")`);
            }
          });
          
          combinedCssText += `\n/* Source: ${href} */\n${cssText}\n`;
        } catch (e) {
          console.warn(`Failed to process stylesheet: ${href}`, e);
        }
      }
    }

    if (combinedCssText) {
      const svgTagEndIndex = svgString.indexOf('>');
      if (svgTagEndIndex !== -1) {
        const start = svgString.slice(0, svgTagEndIndex + 1);
        const end = svgString.slice(svgTagEndIndex + 1);
        const styleDef = `<defs><style type="text/css"><![CDATA[\n${combinedCssText}\n]]></style></defs>`;
        return start + styleDef + end;
      }
    }
  } catch (error) {
    console.warn("Failed to embed web fonts. Export might have missing icons or fonts", error);
  }
  return svgString;
}

async function embedImagesInSVG(svgString: string): Promise<string> {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const images = Array.from(doc.querySelectorAll('image'));
    
    const fetchPromises = images.map(async (img) => {
      const href = img.getAttribute('href') || img.getAttribute('xlink:href');
      if (!href || href.startsWith('data:')) return;
      
      try {
        const response = await fetch(href);
        const blob = await response.blob();
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        if (img.hasAttribute('href')) {
          img.setAttribute('href', base64);
        }
        if (img.hasAttribute('xlink:href')) {
          img.setAttribute('xlink:href', base64);
        }
      } catch (e) {
        console.warn(`Failed to embed image: ${href}`, e);
      }
    });

    await Promise.all(fetchPromises);
    return new XMLSerializer().serializeToString(doc);
  } catch (error) {
    console.warn("Failed to embed SVG images.", error);
  }
  return svgString;
}

function serializeSVG(svgElement: SVGSVGElement): { svgString: string, width: number, height: number } {
  const clone = svgElement.cloneNode(true) as SVGSVGElement;
  
  // Find the exact bounding box of the tree content (the inner group)
  // We expect the first <g> to wrap all nodes and paths.
  const mainGroup = svgElement.querySelector('g');
  
  let boxWidth = 1200;
  let boxHeight = 800;
  let boxX = 0;
  let boxY = 0;

  if (mainGroup && typeof mainGroup.getBBox === 'function') {
    const bbox = mainGroup.getBBox();
    // Add padding around the bounding box so edge elements (like node circles) don't get clipped.
    const padding = 50; 
    boxX = bbox.x - padding;
    boxY = bbox.y - padding;
    boxWidth = bbox.width + padding * 2;
    boxHeight = bbox.height + padding * 2;
  } else {
    // Fallback if getBBox fails for any reason
    const rect = svgElement.getBoundingClientRect();
    boxWidth = rect.width;
    boxHeight = rect.height;
  }

  // Override attributes to ensure the canvas/image captures the actual extents, not the screen size
  clone.setAttribute('width', boxWidth.toString() + 'px');
  clone.setAttribute('height', boxHeight.toString() + 'px');
  clone.setAttribute('viewBox', `${boxX} ${boxY} ${boxWidth} ${boxHeight}`);

  // Reset the transform on the first inner group so the content perfectly matches the new viewBox.
  const clonedGroup = clone.querySelector('g');
  if (clonedGroup) {
    clonedGroup.setAttribute('transform', '');
  }

  const originalElements = Array.from(svgElement.querySelectorAll('*'));
  const clonedElements = Array.from(clone.querySelectorAll('*'));

  // Inline computed styles
  const stylesToInline = [
    'fill', 'stroke', 'stroke-width', 'font-family', 'font-size', 'font-weight', 
    'opacity', 'display', 'visibility', 'text-anchor', 'dominant-baseline'
    // removed 'transform' to avoid re-applying the zoom transform dynamically to the children,
    // though zoom is usually only on the top <g>.
  ];

  originalElements.forEach((orig, index) => {
    const cloned = clonedElements[index] as HTMLElement | SVGElement;
    if (orig instanceof Element && cloned instanceof Element) {
      const computedStyle = window.getComputedStyle(orig);
      stylesToInline.forEach(style => {
        const val = computedStyle.getPropertyValue(style);
        if (val && val !== 'none' && val !== 'normal') {
          try {
            cloned.style.setProperty(style, val);
          } catch (e) {
            // Ignore if setting style fails
          }
        }
      });
      // specifically handle transform on child nodes (like individual g's for nodes) but ignore zoom on the main group
      if (orig !== mainGroup) {
        const transform = computedStyle.getPropertyValue('transform');
        if (transform && transform !== 'none') {
           cloned.style.setProperty('transform', transform);
        }
      }
    }
  });

  return { 
    svgString: new XMLSerializer().serializeToString(clone),
    width: boxWidth,
    height: boxHeight
  };
}

function processImage(
  svgString: string,
  width: number,
  height: number,
  type: 'image/png' | 'image/jpeg',
  initialScale: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const blobURL = URL.createObjectURL(blob);
    
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const MAX_DIMENSION = 16384;
      const MAX_AREA = 268435456; // 16384 * 16384 limit for Chrome/Edge

      // Calculate maximum possible scales directly to keep the highest quality possible
      const maxScaleW = MAX_DIMENSION / width;
      const maxScaleH = MAX_DIMENSION / height;
      const maxScaleArea = Math.sqrt(MAX_AREA / (width * height));

      // Determine the optimal scale that respects all browser limits
      let scale = Math.min(initialScale, maxScaleW, maxScaleH, maxScaleArea);
      
      // Round down slightly to avoid floating point precision issues against strict browser limits
      scale = Math.floor(scale * 100) / 100;

      if (scale < 0.1) {
        URL.revokeObjectURL(blobURL);
        return reject(new Error("The taxonomy tree is too large to export as a PNG/JPG. Please use SVG export instead."));
      }

      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(blobURL);
        return reject(new Error('Failed to get canvas context'));
      }
      
      const isDark = document.documentElement.classList.contains('dark');
      
      if (isDark) {
        // In dark theme, include the dark background even for PNG; otherwise light text would be invisible
        // or end up on an unreadable transparent/white background.
        // Retrieve the body's background color
        const bgColor = window.getComputedStyle(document.body).backgroundColor || '#0f172a';
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (type === 'image/jpeg') {
        // In light theme, JPG uses a white background (no transparency), PNG remains transparent
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (resultBlob) => {
          URL.revokeObjectURL(blobURL);
          if (resultBlob) resolve(resultBlob);
          else reject(new Error('Canvas to Blob failed'));
        },
        type,
        type === 'image/jpeg' ? 0.95 : undefined
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(blobURL);
      reject(new Error('Failed to load SVG into Image'));
    };
    
    img.src = blobURL;
  });
}

import { triggerDownload } from '../utils/download';

export function usePrintSVG(svgRef: RefObject<SVGSVGElement | null>) {
  const prepareSVG = async (svgEl: SVGSVGElement) => {
    const { svgString, width, height } = serializeSVG(svgEl);
    let embedded = await embedFontInSVG(svgString);
    embedded = await embedImagesInSVG(embedded);
    return { svgString: embedded, width, height };
  };

  const printSVG = async (title: string = 'Taxonomy') => {
    if (!svgRef.current) return;
    
    // Open window synchronously to avoid popup blockers
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Pop-up blocked. Please allow pop-ups to print.");
      return;
    }

    const { svgString: embeddedSvgString } = await prepareSVG(svgRef.current);
    
    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
            @media print {
              @page { size: landscape; margin: 0mm; }
              body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              svg { max-width: 100%; max-height: 100vh; page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          ${embeddedSvgString}
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                // window.close(); // Optional: close after printing
              }, 300);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const downloadSVG = async (filename: string = 'export.svg') => {
    if (!svgRef.current) return;
    const { svgString: embeddedSvgString } = await prepareSVG(svgRef.current);
    const blob = new Blob([embeddedSvgString], { type: 'image/svg+xml;charset=utf-8' });
    triggerDownload(blob, filename);
  };

  const getScale = (customScale?: number) => {
    return customScale || Math.max(4, (window.devicePixelRatio || 1) * 2);
  };

  const downloadPNG = async (filename: string = 'export.png', scale?: number) => {
    if (!svgRef.current) return;
    try {
      const { svgString: embeddedSvgString, width, height } = await prepareSVG(svgRef.current);
      const blob = await processImage(embeddedSvgString, width, height, 'image/png', getScale(scale));
      triggerDownload(blob, filename);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to export image.");
    }
  };

  const downloadJPG = async (filename: string = 'export.jpg', scale?: number) => {
    if (!svgRef.current) return;
    try {
      const { svgString: embeddedSvgString, width, height } = await prepareSVG(svgRef.current);
      const blob = await processImage(embeddedSvgString, width, height, 'image/jpeg', getScale(scale));
      triggerDownload(blob, filename);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to export image.");
    }
  };

  return { printSVG, downloadSVG, downloadPNG, downloadJPG };
}
