import { useState } from 'react';

export function useSidebarCollapse(key = 'tb_sidebar_collapsed') {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(key) === '1');

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(key, next ? '1' : '0');
      return next;
    });
  };

  return { collapsed, toggle };
}
