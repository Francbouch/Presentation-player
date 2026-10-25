import { useEffect, useRef } from "react";
import {
  timelineItems,
  timelineGeometry,
  timelineOrder,
  timelineProgress,
} from "./milestoneTimeline.js";
import { TEXT_FONTS } from "./textModel.js";
import { ensureFont } from "./fonts.js";
// Same logical geometry as the live component; no cards, video or runtime listeners.
export function drawMilestoneTimeline(ctx, item, width, height) {
  const t = item.timeline,
    d = t.design,
    items = timelineItems(t),
    g = timelineGeometry(item, items),
    shown = new Set(
      timelineOrder(t)
        .filter((s) => s.visible)
        .slice(0, d.reveal ? d.initialVisible : t.steps.length)
        .map((s) => s.id),
    );
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, width, height);
  ctx.clip();
  if (!d.backgroundTransparent) {
    ctx.fillStyle = d.background;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.scale(width / (item.width * 1920), height / (item.height * 1080));
  if (t.phases.length) {
    ctx.font = `500 20px ${TEXT_FONTS[d.font].css}`;
    ctx.fillStyle = d.textColor;
    ctx.fillText(t.phases.map((p) => p.name).join(" · "), 18, 26);
    ctx.translate(0, 46);
  }
  const path = () => {
    ctx.beginPath();
    g.points.forEach((p, i) =>
      i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y),
    );
  };
  ctx.lineWidth = d.lineWidth;
  ctx.strokeStyle = d.lineColor;
  path();
  ctx.stroke();
  if (d.progress) {
    const progress = timelineProgress(g.points, null, d.initialVisible, d);
    let length = 0;
    for (let i = 1; i < g.points.length; i++)
      length += Math.hypot(
        g.points[i].x - g.points[i - 1].x,
        g.points[i].y - g.points[i - 1].y,
      );
    ctx.setLineDash([(length * progress) / 100, Math.max(1, length)]);
    ctx.strokeStyle = d.progressColor;
    path();
    ctx.stroke();
    ctx.setLineDash([]);
  }
  for (const s of g.points) {
    if (
      d.reveal &&
      !(s.summary
        ? t.steps.some(
            (step) => step.phaseId === s.phase.id && shown.has(step.id),
          )
        : shown.has(s.id))
    )
      continue;
    ctx.beginPath();
    ctx.arc(s.x, s.y, d.dotSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = s.color || d.statusColors[s.status];
    ctx.fill();
    ctx.fillStyle = d.textColor;
    ctx.font = `500 ${d.fontSize}px ${TEXT_FONTS[d.font].css}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const line = [];
    let current = "";
    for (const word of s.name.split(/\s+/)) {
      if (
        current &&
        ctx.measureText(current + " " + word).width > d.spacing * 0.85
      ) {
        line.push(current);
        current = "";
      }
      current += (current ? " " : "") + word;
    }
    if (current) line.push(current);
    line
      .slice(0, 4)
      .forEach((text, i) =>
        ctx.fillText(
          text,
          s.x,
          s.y + d.dotSize / 2 + 18 + i * d.fontSize * 1.3,
        ),
      );
    if (d.showDates && s.date) {
      ctx.font = `400 ${d.fontSize * 0.72}px ${TEXT_FONTS[d.font].css}`;
      ctx.fillText(
        s.date,
        s.x,
        s.y + d.dotSize / 2 + 18 + Math.min(line.length, 4) * d.fontSize * 1.3,
      );
    }
  }
  ctx.restore();
}
export default function MilestoneTimelineThumbnail({ item }) {
  const canvas = useRef(null);
  useEffect(() => {
    let live = true;
    ensureFont(item.timeline.design.font)
      .catch(() => {})
      .then(() => {
        if (live && canvas.current)
          drawMilestoneTimeline(
            canvas.current.getContext("2d"),
            item,
            canvas.current.width,
            canvas.current.height,
          );
      });
    return () => {
      live = false;
    };
  }, [item]);
  return (
    <canvas
      ref={canvas}
      width="480"
      height={Math.max(
        1,
        Math.round((480 * item.height * 1080) / (item.width * 1920)),
      )}
      style={{ width: "100%", height: "100%" }}
      aria-hidden="true"
    />
  );
}
