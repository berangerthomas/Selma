/**
 * Open a new window with the given HTML content for printing.
 * Returns null if the popup was blocked.
 */
export function openPrintWindow(html: string): Window | null {
  const win = window.open('', '_blank');
  if (!win) return null;
  win.document.write(html);
  win.document.close();
  return win;
}