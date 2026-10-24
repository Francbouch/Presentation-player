// Fit the original media first. The mask clips only after its transform.
export function fittedMedia(
  width,
  height,
  maskWidth,
  maskHeight,
  mode = "cover",
) {
  if (
    ![width, height, maskWidth, maskHeight].every(
      (n) => Number.isFinite(n) && n > 0,
    )
  )
    return null;
  const scale = (mode === "contain" ? Math.min : Math.max)(
    maskWidth / width,
    maskHeight / height,
  );
  return { width: width * scale, height: height * scale };
}
export function frameMediaStyle(item, c, size, mask) {
  const width = mask?.width || item.width * 1920,
    height = mask?.height || item.height * 1080;
  const fit = fittedMedia(size?.width, size?.height, width, height, c.mode);
  return {
    position: "absolute",
    inset: "auto",
    width: fit ? `${(fit.width / width) * 100}%` : "100%",
    height: fit ? "auto" : "100%",
    aspectRatio: fit ? `${size.width} / ${size.height}` : undefined,
    left: `${50 + c.x * 100}%`,
    top: `${50 + c.y * 100}%`,
    objectFit: c.mode,
    transform: `translate(-50%,-50%) rotate(${c.rotation || 0}deg) scale(${c.zoom})`,
    transformOrigin: "center",
  };
}
