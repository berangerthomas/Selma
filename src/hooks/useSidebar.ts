import { useState, useEffect } from 'react';

export function useSidebar(activeId: string | null, defaultWidth = 420) {
  const [open, setOpen] = useState(false);
  const [width, setWidth] = useState(defaultWidth);
  useEffect(() => { setOpen(!!activeId); }, [activeId]);
  return { open, setOpen, width, setWidth };
}
