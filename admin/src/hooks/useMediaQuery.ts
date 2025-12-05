import { useState, useEffect } from "react";

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Garante que o código só rode no lado do cliente (navegador)
    if (typeof window !== "undefined") {
      const media = window.matchMedia(query);
      if (media.matches !== matches) {
        setMatches(media.matches);
      }
      const listener = () => setMatches(media.matches);
      window.addEventListener("resize", listener);
      return () => window.removeEventListener("resize", listener);
    }
  }, [matches, query]);

  return matches;
}

export default useMediaQuery;
