import { useState, useEffect } from "react";

type BreakpointKey = "xs" | "sm" | "md" | "lg" | "xl";

interface Breakpoints {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
}

const defaultBreakpoints: Breakpoints = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
};

export const useResponsive = (customBreakpoints?: Partial<Breakpoints>) => {
  const breakpoints = { ...defaultBreakpoints, ...customBreakpoints };

  const [screenSize, setScreenSize] = useState<BreakpointKey>("md");
  const [width, setWidth] = useState<number>(0);

  useEffect(() => {
    const handleResize = () => {
      const currentWidth = window.innerWidth;
      setWidth(currentWidth);

      if (currentWidth >= breakpoints.xl) {
        setScreenSize("xl");
      } else if (currentWidth >= breakpoints.lg) {
        setScreenSize("lg");
      } else if (currentWidth >= breakpoints.md) {
        setScreenSize("md");
      } else if (currentWidth >= breakpoints.sm) {
        setScreenSize("sm");
      } else {
        setScreenSize("xs");
      }
    };

    // Verificação inicial
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [breakpoints]);

  const isMobile = screenSize === "xs" || screenSize === "sm";
  const isTablet = screenSize === "md";
  const isDesktop = screenSize === "lg" || screenSize === "xl";

  return {
    screenSize,
    width,
    isMobile,
    isTablet,
    isDesktop,
    breakpoints,
  };
};
