import {durationSettings,durationLength,durationLabel,durationText,dateLabel,durationAxis} from './timelineDuration.js';
import {timelineUnits} from "./timelineParallel.js";
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
      timelineUnits(t,true).slice(0,d.reveal?d.initialVisible:t.steps.length).flatMap(u=>u.steps.map(s=>s.id)),
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
  if (t.phases.length && d.phaseNavigationVisible!==false) {
    ctx.font = `500 20px ${TEXT_FONTS[d.font].css}`;
    ctx.fillStyle = d.textColor;
    ctx.fillText(t.phases.map((p) => p.name).join(" · "), 18, 26);
    ctx.translate(0, 46);
  }
  if(g.segments){
    const progress=timelineProgress(g.points,null,d.initialVisible,d),activeUnit=progress/100*Math.max(1,g.units.length-1);
    for(const segment of g.segments){
      if(d.reveal&&!g.units[segment.unitIndex].steps.some(s=>shown.has(s.id)))continue;
      ctx.globalAlpha=(segment.group?.opacity??100)/100;
      ctx.lineWidth=segment.group?.width||d.lineWidth;
      ctx.strokeStyle=segment.group?.color||d.lineColor;
      ctx.lineCap='round';ctx.lineJoin='round';
      const path=new Path2D(segment.d);ctx.stroke(path);
      if(d.progress&&activeUnit+1e-6>=segment.unitIndex){ctx.strokeStyle=d.progressColor;ctx.stroke(path);}
    }
    ctx.globalAlpha=1;
  }else{
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
    if(!s.summary)drawDurations(ctx,item,s,g.points);
    ctx.beginPath();
    ctx.arc(s.x, s.y, (s.summary?s.dotSize:d.dotSize) / 2, 0, Math.PI * 2);
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
    const titleX = s.x + (s.titleOffset?.x || 0),
      titleY = s.titleOffset ? s.y + s.titleOffset.y : s.y + (s.summary&&(d.phaseDotSize!==undefined||s.phase.dotSize!==undefined)?Math.max(24.96,s.dotSize/2+12):d.dotSize/2+18);
    line
      .slice(0, 4)
      .forEach((text, i) =>
        ctx.fillText(text, titleX, titleY + i * d.fontSize * 1.3),
      );
    if (d.showDates && s.date) {
      ctx.font = `400 ${d.fontSize * 0.72}px ${TEXT_FONTS[d.font].css}`;
      ctx.fillText(
        s.date,
        titleX,
        titleY + Math.min(line.length, 4) * d.fontSize * 1.3,
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

function drawDurations(ctx,item,step,points){
 if(!step.timing)return;const t=item.timeline,d=durationSettings(t,step);
 for(const k of ['a','b']){const a=d[k],length=durationLength(t,step,k),axis=durationAxis(t,step,points,k),angle=axis.y?Math.PI/2:axis.x<0?Math.PI:0;if(!d.display[k]||length===null)continue;ctx.save();ctx.translate(step.x-axis.y*a.offset,step.y+axis.x*a.offset);ctx.rotate(angle);ctx.globalAlpha=a.opacity/100;ctx.fillStyle=a.color;ctx.beginPath();ctx.roundRect(0,-a.thickness/2,length,a.thickness,Math.min(a.radius||0,a.thickness/2));ctx.fill();if(k==='b'&&a.marker!=='none'){ctx.strokeStyle=a.color;ctx.lineWidth=2;ctx.beginPath();if(a.marker==='dot')ctx.arc(length,0,a.markerSize/2,0,2*Math.PI);else if(a.marker==='arrow'){ctx.moveTo(length-a.markerSize/2,-a.markerSize/2);ctx.lineTo(length,0);ctx.lineTo(length-a.markerSize/2,a.markerSize/2);}else{ctx.moveTo(length,-a.markerSize/2);ctx.lineTo(length,a.markerSize/2);}a.marker==='dot'?ctx.fill():ctx.stroke();}ctx.globalAlpha=1;ctx.fillStyle=t.design.textColor;ctx.font=`400 16px ${TEXT_FONTS[t.design.font].css}`;ctx.textAlign='center';ctx.textBaseline='middle';if(a.text)ctx.fillText(durationText(step.timing),length/2,k==='a'?0:-20);if(k==='a'&&a.dates){ctx.font=`400 14px ${TEXT_FONTS[t.design.font].css}`;ctx.fillText(dateLabel(step.timing.start,d.c.format),0,25);ctx.fillText(dateLabel(step.timing.end,d.c.format),length,25);}ctx.restore();}
 const label=durationLabel(t,step);if(d.display.c&&label){ctx.save();ctx.font=`400 ${d.c.fontSize}px ${TEXT_FONTS[t.design.font].css}`;const w=ctx.measureText(label).width+16;ctx.translate(step.x+d.c.offset.x,step.y+d.c.offset.y);ctx.globalAlpha=d.c.bgOpacity/100;ctx.fillStyle=d.c.background;ctx.beginPath();ctx.roundRect(-w/2,0,w,d.c.fontSize*1.3+8,d.c.radius);ctx.fill();ctx.globalAlpha=1;ctx.fillStyle=d.c.textColor;ctx.textAlign='center';ctx.textBaseline='top';ctx.fillText(label,0,4);ctx.restore();}
}
