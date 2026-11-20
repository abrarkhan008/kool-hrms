import { useState } from "react";

export default function usePersist(key, init) {
  const [v, setV] = useState(() => {
    try {
      return localStorage.getItem(key) || init;
    } catch {
      return init;
    }
  });
  const set = (x) => {
    setV(x);
    try {
      localStorage.setItem(key, x);
    } catch {}
  };
  return [v, set];
}
