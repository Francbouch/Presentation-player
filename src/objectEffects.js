export const defaultObjectEffects = () => ({
  shadow: {
    enabled: false,
    color: "#000000",
    opacity: 0.4,
    x: 8,
    y: 8,
    blur: 12,
  },
  blur: { enabled: false, amount: 4 },
});
export function objectFilter(e, unit = (n) => `${n / 19.2}cqw`) {
  if (!e) return undefined;
  const result = [];
  if (e.shadow.enabled) {
    const s = e.shadow;
    result.push(
      `drop-shadow(${unit(s.x)} ${unit(s.y)} ${unit(s.blur)} ${s.color}${Math.round(
        s.opacity * 255,
      )
        .toString(16)
        .padStart(2, "0")})`,
    );
  }
  if (e.blur.enabled) result.push(`blur(${unit(e.blur.amount)})`);
  return result.join(" ") || undefined;
}
export function validateObjectEffects(value) {
  if (value === undefined) return;
  const e = value,
    n = (v, a, b) => Number.isFinite(v) && v >= a && v <= b;
  const s = e?.shadow,
    b = e?.blur;
  if (
    !s ||
    !b ||
    typeof s.enabled !== "boolean" ||
    typeof b.enabled !== "boolean" ||
    !/^#[0-9a-f]{6}$/i.test(s.color) ||
    !n(s.opacity, 0, 1) ||
    !n(s.x, -300, 300) ||
    !n(s.y, -300, 300) ||
    !n(s.blur, 0, 64) ||
    !n(b.amount, 0, 32)
  )
    throw Error("Effets visuels invalides. Votre projet est conservé.");
}
