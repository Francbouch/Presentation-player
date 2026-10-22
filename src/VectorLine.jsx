import { strokeDash } from "./vectorLines.js";
export default function VectorLine({ item, hit = false }) {
  const s = item.stroke,
    e = item.endpoints,
    w = item.width * 1920,
    h = item.height * 1080,
    a = { x: e.x1 * w, y: e.y1 * h },
    b = { x: e.x2 * w, y: e.y2 * h },
    angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
    size = Math.max(s.width, 0.5) * s.decorationScale;
  const decoration = (point, kind, rotation, key) =>
    kind === "none" ? null : kind === "dot" ? (
      <circle
        key={key}
        className="line-decoration"
        cx={point.x}
        cy={point.y}
        r={size / 2}
      />
    ) : (
      <path
        key={key}
        className="line-decoration"
        d={`M 0 0 L ${-size} ${-size * 0.5} L ${-size} ${size * 0.5} Z`}
        transform={`translate(${point.x} ${point.y}) rotate(${rotation})`}
      />
    );
  return (
    <svg
      className="vector-line-svg"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {s.enabled && s.width > 0 && (
        <g
          className="vector-line-paint"
          stroke={s.color}
          fill={s.color}
          opacity={s.opacity}
        >
          <line
            className="vector-line-stroke"
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            strokeWidth={s.width}
            strokeLinecap={s.pattern === "dots" ? "round" : s.cap}
            strokeDasharray={strokeDash(s)?.join(" ")}
            strokeDashoffset={s.offset}
          />
          <g stroke="none">
            {decoration(a, s.start, angle + 180, "start")}
            {decoration(b, s.end, angle, "end")}
          </g>
        </g>
      )}
      {hit && (
        <line
          className="vector-line-hit"
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          stroke="transparent"
          strokeWidth="10"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}
