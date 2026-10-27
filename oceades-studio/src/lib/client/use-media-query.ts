"use client";
import * as React from "react";

export function useMediaQuery(query: string, initial = true): boolean {
  const [matches, setMatches] = React.useState(initial);
  React.useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const onChange = () => setMatches(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}
