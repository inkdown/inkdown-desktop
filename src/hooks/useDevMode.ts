import { useMemo } from "react";

export function useDevMode(devMode?: boolean) {
  const isDevMode = useMemo(() => {
    return devMode ?? false;
  }, [devMode]);

  return {
    isDevMode,
  };
}