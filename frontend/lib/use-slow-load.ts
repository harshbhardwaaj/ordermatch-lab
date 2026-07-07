import { useEffect, useState } from "react";

/** Flips to true only if `isLoading` stays true past `delayMs`, so a fast,
 * warm-backend load never shows a "this is taking a while" message. */
export function useSlowLoad(isLoading: boolean, delayMs = 4000) {
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setIsSlow(false);
      return;
    }
    const timer = setTimeout(() => setIsSlow(true), delayMs);
    return () => clearTimeout(timer);
  }, [isLoading, delayMs]);

  return isSlow;
}
