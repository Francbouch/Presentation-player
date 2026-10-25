import {createPortal} from 'react-dom';
import { useEffect, useLayoutEffect, useRef, useState } from "react";
const KEY = "studio.workspace.v1";
const defaults = {
  left: 216,
  right: 340,
  timeline: 218,
  leftOpen: true,
  zoom: 0,
  sections: {},
};
export function useWorkspace() {
  const [settings, setSettings] = useState(() => {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) || "{}");
      return {
        ...defaults,
        ...value,
        left: Math.min(340, Math.max(160, +value.left || 216)),
        right: Math.min(520, Math.max(280, +value.right || 340)),
        timeline: Math.min(400, Math.max(140, +value.timeline || 218)),
        zoom: 0,
        sections:
          value.sections && typeof value.sections === "object"
            ? value.sections
            : {},
      };
    } catch {
      return defaults;
    }
  });
  const latest = useRef(settings);
  function change(patch) {
    const old = latest.current;
    const next = {
      ...old,
      ...(typeof patch === "function" ? patch(old) : patch),
    };
    latest.current = next;
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
    setSettings(next);
  }
  return [settings, change];
}
export function ResizeHandle({
  label,
  value,
  min,
  max,
  axis = "x",
  reverse = false,
  change,
}) {
  const drag = useRef(null);
  return (
    <div
      className={`workspace-divider divider-${axis}`}
      role="separator"
      tabIndex={0}
      aria-label={label}
      aria-orientation={axis === "x" ? "vertical" : "horizontal"}
      aria-valuenow={Math.round(value)}
      aria-valuemin={min}
      aria-valuemax={max}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        drag.current = { start: axis === "x" ? e.clientX : e.clientY, value };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        const delta =
          ((axis === "x" ? e.clientX : e.clientY) - drag.current.start) *
          (reverse ? -1 : 1);
        change(Math.min(max, Math.max(min, drag.current.value + delta)));
      }}
      onPointerUp={(e) => {
        drag.current = null;
        if (e.currentTarget.hasPointerCapture(e.pointerId))
          e.currentTarget.releasePointerCapture(e.pointerId);
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
      onLostPointerCapture={() => {
        drag.current = null;
      }}
      onKeyDown={(e) => {
        const delta = ["ArrowRight", "ArrowDown"].includes(e.key)
          ? 10
          : ["ArrowLeft", "ArrowUp"].includes(e.key)
            ? -10
            : 0;
        if (delta) {
          e.preventDefault();
          change(
            Math.min(max, Math.max(min, value + delta * (reverse ? -1 : 1))),
          );
        }
      }}
    >
      <span />
    </div>
  );
}
// View coordinates are screen pixels; document geometry is never changed by navigation.
export function FitCanvas({
  controlsTarget,
  zoom,
  change,
  children,
  selection = [],
  editing = true,
}) {
  const root = useRef(null),
    canvas = useRef(null),
    drag = useRef(null),
    space = useRef(false),
    pending = useRef(null);
  const [hand, setHand] = useState(false),
    [pan, setPan] = useState({ x: 0, y: 0 }),
    [bounds, setBounds] = useState({ width: 600, height: 400 });
  useLayoutEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setBounds({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }),
    );
    observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  const fit = Math.max(
      40,
      Math.min(bounds.width - 48, ((bounds.height - 48) * 16) / 9),
    ),
    width = zoom ? (1920 * zoom) / 100 : fit,
    percent = Math.round((width / 1920) * 100);
  function navigate(next, point) {
    const el = root.current,
      rect = el.getBoundingClientRect(),
      at = point || {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    const old = canvas.current.getBoundingClientRect(),
      ratio = (next ? (1920 * next) / 100 : fit) / width;
    pending.current = {
      x: at.x - (at.x - old.left) * ratio,
      y: at.y - (at.y - old.top) * ratio,
    };
    change(next);
  }
  useLayoutEffect(() => {
    if (!pending.current) return;
    const rect = canvas.current.getBoundingClientRect(),
      target = pending.current;
    pending.current = null;
    setPan((p) => ({
      x: p.x + target.x - rect.left,
      y: p.y + target.y - rect.top,
    }));
  }, [width]);
  function oneToOne() {
    if (!selection.length) {
      navigate(100);
      return;
    }
    const x =
      (Math.min(...selection.map((l) => l.x)) +
        Math.max(...selection.map((l) => l.x + l.width))) /
      2;
    const y =
      (Math.min(...selection.map((l) => l.y)) +
        Math.max(...selection.map((l) => l.y + l.height))) /
      2;
    pending.current = null;
    change(100);
    setPan({ x: (0.5 - x) * 1920, y: (0.5 - y) * 1080 });
  }
  function reset() {
    pending.current = null;
    setPan({ x: 0, y: 0 });
    change(0);
  }
  function fitSelection() {
    if (!selection.length) return;
    const xs = selection.flatMap((l) => {
      const r = ((l.rotation || 0) * Math.PI) / 180,
        w = l.width * 1920,
        h = l.height * 1080;
      const bw = Math.abs(w * Math.cos(r)) + Math.abs(h * Math.sin(r)),
        bh = Math.abs(w * Math.sin(r)) + Math.abs(h * Math.cos(r));
      return [
        {
          x: (l.x + l.width / 2) * 1920 - bw / 2,
          y: (l.y + l.height / 2) * 1080 - bh / 2,
        },
        {
          x: (l.x + l.width / 2) * 1920 + bw / 2,
          y: (l.y + l.height / 2) * 1080 + bh / 2,
        },
      ];
    });
    const minX = Math.min(...xs.map((p) => p.x)),
      maxX = Math.max(...xs.map((p) => p.x)),
      minY = Math.min(...xs.map((p) => p.y)),
      maxY = Math.max(...xs.map((p) => p.y));
    const z = Math.min(
      400,
      Math.max(
        5,
        100 *
          Math.min(
            (bounds.width - 64) / Math.max(1, maxX - minX),
            (bounds.height - 64) / Math.max(1, maxY - minY),
          ),
      ),
    );
    pending.current = null;
    change(z);
    setPan({
      x: ((960 - (minX + maxX) / 2) * z) / 100,
      y: ((540 - (minY + maxY) / 2) * z) / 100,
    });
  }
  useEffect(() => {
    function keys(e) {
      // Releasing Space must always restore the tool, even if focus moved into
      // a text field (or the editor mode changed) while the key was held.
      if (e.type === "keyup" && e.code === "Space") {
        space.current = false;
        setHand(false);
        return;
      }
      if (
        !editing ||
        e.target.closest(
          'dialog,input,textarea,select,[contenteditable="true"]',
        )
      )
        return;
      if (
        e.code === "Space" &&
        (!e.target.closest("button,summary") ||
          root.current?.matches(":hover") ||
          e.type === "keyup")
      ) {
        space.current = e.type === "keydown";
        setHand(space.current);
        if (space.current) e.preventDefault();
      }
      if (e.type !== "keydown") return;
      if ((e.ctrlKey || e.metaKey) && e.key === "0") {
        e.preventDefault();
        reset();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "1") {
        e.preventDefault();
        oneToOne();
      } else if (e.shiftKey && e.code === "Digit2") {
        e.preventDefault();
        fitSelection();
      }
    }
    function blur() {
      space.current = false;
      setHand(false);
      drag.current = null;
    }
    window.addEventListener("keydown", keys);
    window.addEventListener("keyup", keys);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", keys);
      window.removeEventListener("keyup", keys);
      window.removeEventListener("blur", blur);
    };
  });
  useEffect(() => {
    const el = root.current;
    function wheel(e) {
      if (!editing || (!e.ctrlKey && !e.metaKey)) return;
      e.preventDefault();
      navigate(
        Math.min(
          400,
          Math.max(
            5,
            (zoom || (fit / 1920) * 100) * Math.exp(-e.deltaY * 0.002),
          ),
        ),
        { x: e.clientX, y: e.clientY },
      );
    }
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  });
  return (
    <>
      {controlsTarget && createPortal(<div
        className="canvas-zoom"
        role="toolbar"
        aria-label="Affichage de la scène"
      >
        <button type="button" aria-label="Ajuster à l’écran" data-toolbar-icon="⛶" title="Ajuster à l’écran (Ctrl + 0)" onClick={reset}>
          Ajuster à l’écran
        </button>
        <button
          type="button"
          disabled={!selection.length}
          aria-label="Ajuster la sélection" data-toolbar-icon="⌖" title="Ajuster la sélection (Maj + 2)"
          onClick={fitSelection}
        >
          Ajuster la sélection
        </button>
        <button
          type="button"
          aria-label="Réduire le zoom"
          onClick={() => navigate(Math.max(5, percent - 10))}
        >
          −
        </button>
        <input
          aria-label="Zoom en pourcentage"
          type="number"
          min="5"
          max="400"
          value={percent}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (n >= 5 && n <= 400) navigate(n);
          }}
        />
        <output aria-label="Niveau de zoom">{percent} %</output>
        <button
          type="button"
          aria-label="Augmenter le zoom"
          onClick={() => navigate(Math.min(400, percent + 10))}
        >
          +
        </button>
        <button type="button" title="Ctrl + 1" onClick={oneToOne}>
          100 %
        </button>
      </div>, controlsTarget)}
      <div
        className={`canvas-scroll intelligent-canvas ${hand ? "hand-tool" : ""}`}
        ref={root}
        onPointerDownCapture={(e) => {
          if (!editing || !space.current || e.button !== 0) return;
          e.preventDefault();
          e.stopPropagation();
          drag.current = { x: e.clientX, y: e.clientY, pan };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMoveCapture={(e) => {
          if (!drag.current) return;
          e.stopPropagation();
          setPan({
            x: drag.current.pan.x + e.clientX - drag.current.x,
            y: drag.current.pan.y + e.clientY - drag.current.y,
          });
        }}
        onPointerUpCapture={(e) => {
          if (!drag.current) return;
          e.stopPropagation();
          drag.current = null;
          e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <div className="canvas-sheet">
          <div
            ref={canvas}
            className="layer-canvas"
            style={{ width, transform: `translate(${pan.x}px,${pan.y}px)` }}
          >
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
export function Icon({ name }) {
  const paths = {
    select: "m5 3 14 9-7 2-3 7Z",
    text: "M4 5h16M12 5v15M8 20h8",
    image: "M3 4h18v16H3ZM3 16l6-6 5 5 3-3 4 4M8 8h.01",
    shape: "M4 4h16v16H4Z",
    circle: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18",
    line: "M4 20 20 4",
    timeline: "M3 12h18M5 8v8M12 5v14M19 8v8M3 4h4M17 20h4",
    button: "M4 6h16v12H4ZM9 10l6 2-6 2Z",
    layers: "m12 3 10 5-10 5L2 8Zm-10 9 10 5 10-5M2 16l10 5 10-5",
    media: "M3 5h7l2 3h9v12H3Z",
    page: "M5 3h14v18H5ZM8 8h8M8 12h8M8 16h5",
    states: "M4 4h6v6H4ZM14 14h6v6h-6ZM10 7h7v7",
  };
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.select} />
    </svg>
  );
}
