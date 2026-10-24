import { useLayoutEffect, useRef, useState } from "react";
// Observe layout dimensions, unaffected by canvas zoom or layer rotation.
export default function useMaskDimensions(source) {
  const ref = useRef(null),
    [size, setSize] = useState(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!source || !element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width && height)
        setSize((previous) =>
          previous?.width === width && previous.height === height
            ? previous
            : { width, height },
        );
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [source]);
  return [ref, size];
}
