import { useEffect, useState } from 'react';

export const BREAKPOINTS = {
  mobile: 640,   // < 640px = mobile (phones)
  tablet: 1024,  // 640–1023px = tablet ; ≥ 1024px = desktop
} as const;

export type ViewportSize = 'mobile' | 'tablet' | 'desktop';

const computeSize = (w: number): ViewportSize => {
  if (w < BREAKPOINTS.mobile) return 'mobile';
  if (w < BREAKPOINTS.tablet) return 'tablet';
  return 'desktop';
};

export function useViewport() {
  const [width, setWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const size = computeSize(width);
  return {
    width,
    size,
    isMobile: size === 'mobile',
    isTablet: size === 'tablet',
    isDesktop: size === 'desktop',
    isMobileOrTablet: size !== 'desktop',
  };
}
