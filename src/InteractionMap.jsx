import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  buildInteractionGraph,
  filterInteractionGraph,
  arrangeGraph,
  graphKinds,
} from "./interactionGraph.js";
const icons = {
  page: "▱",
  state: "◇",
  button: "▣",
  video: "▶",
  action: "↗",
  destination: "◎",
  layer: "▤",
};
export default function InteractionMap({
  document,
  pageId,
  close,
  openElement,
}) {
  const dialog = useRef(null),
    area = useRef(null),
    drag = useRef(null),
    [filter, setFilter] = useState("all"),
    [positions, setPositions] = useState(() => {
      try {
        return (
          JSON.parse(
            localStorage.getItem("studio.interactions.positions") || "{}",
          ) || {}
        );
      } catch {
        return {};
      }
    }),
    [view, setView] = useState({ x: 20, y: 20, scale: 1 });
  const graph = useMemo(
    () =>
      filterInteractionGraph(buildInteractionGraph(document), filter, pageId),
    [document, filter, pageId],
  );
  const auto = useMemo(() => arrangeGraph(graph.nodes), [graph]),
    points = Object.fromEntries(
      graph.nodes.map((n) => {
        const p = positions[n.id];
        return [
          n.id,
          p && Number.isFinite(p.x) && Number.isFinite(p.y) ? p : auto[n.id],
        ];
      }),
    );
  function fit() {
    const box = area.current.getBoundingClientRect(),
      all = Object.values(points);
    if (!all.length) {
      setView({ x: 20, y: 20, scale: 1 });
      return;
    }
    const minX = Math.min(...all.map((p) => p.x)),
      maxX = Math.max(...all.map((p) => p.x)) + 220,
      minY = Math.min(...all.map((p) => p.y)),
      maxY = Math.max(...all.map((p) => p.y)) + 75,
      scale = Math.min(
        1.5,
        Math.max(
          0.05,
          Math.min(
            (box.width - 64) / (maxX - minX),
            (box.height - 64) / (maxY - minY),
          ),
        ),
      );
    setView({
      scale,
      x: (box.width - (maxX - minX) * scale) / 2 - minX * scale,
      y: (box.height - (maxY - minY) * scale) / 2 - minY * scale,
    });
  }
  useEffect(() => {
    const previous = window.document.activeElement;
    dialog.current.showModal();
    return () => previous?.focus();
  }, []);
  useLayoutEffect(() => {
    fit();
  }, [filter]);
  useEffect(() => {
    const root = area.current;
    function wheel(e) {
      e.preventDefault();
      const box = root.getBoundingClientRect(),
        x = e.clientX - box.left,
        y = e.clientY - box.top;
      setView((v) => {
        const scale = Math.min(
            3,
            Math.max(0.05, v.scale * Math.exp(-e.deltaY * 0.002)),
          ),
          ratio = scale / v.scale;
        return { scale, x: x - (x - v.x) * ratio, y: y - (y - v.y) * ratio };
      });
    }
    root.addEventListener("wheel", wheel, { passive: false });
    return () => root.removeEventListener("wheel", wheel);
  }, []);
  function remember(next) {
    setPositions(next);
    try {
      localStorage.setItem(
        "studio.interactions.positions",
        JSON.stringify(next),
      );
    } catch {}
  }
  function zoom(ratio) {
    const b = area.current.getBoundingClientRect();
    setView((v) => {
      const scale = Math.max(0.05, Math.min(3, v.scale * ratio)),
        r = scale / v.scale;
      return {
        scale,
        x: b.width / 2 - (b.width / 2 - v.x) * r,
        y: b.height / 2 - (b.height / 2 - v.y) * r,
      };
    });
  }
  return (
    <dialog
      className="interaction-map"
      ref={dialog}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <header>
        <strong>Vue des interactions</strong>
        <button autoFocus className="ui-button" onClick={close}>
          Retour à l’éditeur
        </button>
      </header>
      <div className="graph-toolbar">
        <label>
          Afficher{" "}
          <select
            aria-label="Filtrer les interactions"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {[
              ["all", "Toutes les interactions"],
              ["current", "Diapositive actuelle"],
              ["state", "Changements d’état"],
              ["video", "Vidéos"],
              ["navigate", "Navigations"],
              ["visibility", "Actions de visibilité"],
            ].map(([id, label]) => (
              <option value={id} key={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button onClick={() => zoom(0.8)} aria-label="Réduire le schéma">
          −
        </button>
        <output>{Math.round(view.scale * 100)} %</output>
        <button onClick={() => zoom(1.25)} aria-label="Agrandir le schéma">
          +
        </button>
        <button onClick={() => setView((v) => ({ ...v, x: 20, y: 20 }))}>
          Recentrer
        </button>
        <button onClick={fit}>Ajuster le schéma</button>
        <button
          onClick={() => {
            const next = { ...positions };
            for (const n of graph.nodes) delete next[n.id];
            remember(next);
            setView({ x: 20, y: 20, scale: 1 });
          }}
        >
          Réorganiser automatiquement
        </button>
      </div>
      <p className="graph-help">
        Double-cliquez sur un bloc (ou Entrée) pour l’ouvrir. Glissez les blocs
        pour les ranger, le fond pour naviguer. La molette zoome.{" "}
        {graph.nodes.filter((n) => n.warning).length} avertissement(s).
      </p>
      <div
        className="graph-viewport"
        ref={area}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          drag.current = { id: null, x: e.clientX, y: e.clientY, start: view };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          if (d.id)
            setPositions((p) => ({
              ...p,
              [d.id]: {
                x: d.start.x + (e.clientX - d.x) / view.scale,
                y: d.start.y + (e.clientY - d.y) / view.scale,
              },
            }));
          else
            setView((v) => ({
              ...v,
              x: d.start.x + e.clientX - d.x,
              y: d.start.y + e.clientY - d.y,
            }));
        }}
        onPointerUp={(e) => {
          if (!drag.current) return;
          if (drag.current.id) remember(positions);
          drag.current = null;
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <div
          className="graph-world"
          style={{
            transform: `translate(${view.x}px,${view.y}px) scale(${view.scale})`,
          }}
        >
          <svg
            className="graph-edges"
            aria-label="Connexions"
            width="1"
            height="1"
          >
            <defs>
              <marker
                id="graph-arrow"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#a79ac8" />
              </marker>
            </defs>
            {graph.edges.map((e) => {
              const a = points[e.from],
                b = points[e.to];
              if (!a || !b) return null;
              const x = a.x + 220,
                y = a.y + 38,
                tx = b.x,
                ty = b.y + 38;
              return (
                <g key={e.id}>
                  <path
                    d={`M${x},${y} C${x + 70},${y} ${tx - 70},${ty} ${tx},${ty}`}
                    fill="none"
                    stroke="#8d81ab"
                    strokeWidth="1.5"
                    markerEnd="url(#graph-arrow)"
                  />
                  <text
                    x={(x + tx) / 2}
                    y={(y + ty) / 2 - 6}
                    fill="#b6a9cf"
                    fontSize="10"
                  >
                    {e.label}
                  </text>
                </g>
              );
            })}
          </svg>
          {graph.nodes.map((n) => (
            <button
              key={n.id}
              data-graph-id={n.id}
              className={`graph-node graph-${n.kind} ${n.warning ? "graph-invalid" : ""}`}
              style={{ left: points[n.id].x, top: points[n.id].y }}
              title={n.warning || "Double-cliquez pour ouvrir dans l’éditeur"}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                e.stopPropagation();
                drag.current = {
                  id: n.id,
                  x: e.clientX,
                  y: e.clientY,
                  start: points[n.id],
                };
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onDoubleClick={() => openElement(n.location)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  openElement(n.location);
                } else if (
                  ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
                    e.key,
                  )
                ) {
                  e.preventDefault();
                  const p = points[n.id];
                  remember({
                    ...positions,
                    [n.id]: {
                      x:
                        p.x +
                        (e.key === "ArrowRight"
                          ? 10
                          : e.key === "ArrowLeft"
                            ? -10
                            : 0),
                      y:
                        p.y +
                        (e.key === "ArrowDown"
                          ? 10
                          : e.key === "ArrowUp"
                            ? -10
                            : 0),
                    },
                  });
                }
              }}
            >
              <small>
                {icons[n.kind]} {graphKinds[n.kind]}
              </small>
              <strong>{n.label}</strong>
              {n.warning && <span>⚠ {n.warning}</span>}
            </button>
          ))}
        </div>
        {!graph.nodes.length && (
          <p className="graph-empty">Aucune interaction pour ce filtre.</p>
        )}
      </div>
    </dialog>
  );
}
