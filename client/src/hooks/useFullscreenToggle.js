import { useCallback, useEffect, useRef, useState } from 'react';

const DOUBLE_TAP_MS = 300;

function getFullscreenElement() {
  return (
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.msFullscreenElement ||
    null
  );
}

async function requestFs(el) {
  if (el.requestFullscreen) return el.requestFullscreen();
  if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
  if (el.msRequestFullscreen) return el.msRequestFullscreen();
  throw new Error('Fullscreen API unsupported');
}

async function exitFs() {
  if (document.exitFullscreen) return document.exitFullscreen();
  if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
  if (document.msExitFullscreen) return document.msExitFullscreen();
  throw new Error('Fullscreen API unsupported');
}

/**
 * 하단 로고 더블탭용 전체화면 토글.
 * Fullscreen API 실패 시 CSS fallback 클래스만 적용.
 */
export function useFullscreenToggle(containerRef) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cssFallback, setCssFallback] = useState(false);
  const lastTapRef = useRef(0);
  const suppressClickRef = useRef(false);

  const syncFromDocument = useCallback(() => {
    const active = !!getFullscreenElement();
    setIsFullscreen(active || cssFallback);
    if (active) setCssFallback(false);
  }, [cssFallback]);

  useEffect(() => {
    const onChange = () => {
      const active = !!getFullscreenElement();
      setIsFullscreen(active || cssFallback);
      if (active) setCssFallback(false);
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, [cssFallback]);

  useEffect(() => {
    const el = containerRef?.current;
    if (!el) return;
    if (cssFallback) el.classList.add('cw-fs-fallback');
    else el.classList.remove('cw-fs-fallback');
    return () => el.classList.remove('cw-fs-fallback');
  }, [cssFallback, containerRef]);

  const toggle = useCallback(async () => {
    const el = containerRef?.current || document.documentElement;
    const inNative = !!getFullscreenElement();

    if (inNative) {
      try {
        await exitFs();
      } catch {
        /* ignore */
      }
      setCssFallback(false);
      setIsFullscreen(false);
      return;
    }

    if (cssFallback) {
      setCssFallback(false);
      setIsFullscreen(false);
      return;
    }

    try {
      await requestFs(el);
      setIsFullscreen(true);
      setCssFallback(false);
    } catch {
      setCssFallback(true);
      setIsFullscreen(true);
    }
  }, [containerRef, cssFallback]);

  const onLogoPointerUp = useCallback(
    (e) => {
      // 로고 영역에서만
      const now = Date.now();
      if (now - lastTapRef.current < DOUBLE_TAP_MS) {
        lastTapRef.current = 0;
        suppressClickRef.current = true;
        e.preventDefault();
        e.stopPropagation();
        toggle();
        setTimeout(() => {
          suppressClickRef.current = false;
        }, 350);
        return;
      }
      lastTapRef.current = now;
    },
    [toggle]
  );

  const onLogoClick = useCallback((e) => {
    if (suppressClickRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  return {
    isFullscreen,
    cssFallback,
    onLogoPointerUp,
    onLogoClick,
    syncFromDocument,
  };
}
