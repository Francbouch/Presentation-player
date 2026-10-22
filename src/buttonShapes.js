// La forme ne change jamais l’identité, les actions ou la géométrie du bouton.
export const buttonShapeRadius = (item, unit = n => `${n}px`) =>
  item.buttonShape === 'ellipse' ? '50%' : item.buttonShape === 'rectangle' ? '0px' : item.appearance ? unit(item.appearance.radius) : undefined;
export const rgba = (color, opacity = 1) => `${color}${Math.round(Math.max(0,Math.min(1,opacity))*255).toString(16).padStart(2,'0')}`;
export function shapeClip(item, unit) {
  return item.buttonShape === 'ellipse' ? 'ellipse(50% 50% at 50% 50%)' : `inset(0 round ${buttonShapeRadius(item,unit)||'0px'})`;
}
