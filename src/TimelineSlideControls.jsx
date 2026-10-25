import { createPortal } from "react-dom";
import { TEXT_FONTS } from "./textModel.js";
// Keep navigation usable when its original Timeline frame is outside the slide.
export default function TimelineSlideControls({
  root,
  item,
  enabled,
  placement,
  children,
}) {
  const host = root?.closest(".interactive-button-layer");
  if (!enabled || !host) return children;
  const d = item.timeline.design;
  return createPortal(
    <div
      className={`timeline-slide-controls controls-${placement}`}
      data-timeline-controls-owner={item.id}
      style={{
        fontFamily: TEXT_FONTS[d.font].css,
        color: d.textColor,
        opacity: item.opacity ?? 1,
      }}
    >
      {children}
    </div>,
    host,
  );
}
