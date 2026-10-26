// Only focused playback controls own Space/arrows. Elsewhere Studio keeps its shortcuts.
export function localVideoKeyboardFocus(event) {
  return !!event.target?.closest?.('video[controls],.local-video-interacting,.frame-video-controlbar,.frame-video-edit-exit');
}
export function needsFrameControls(item, crop) {
  return item.type === 'circle' || crop.x !== 0 || crop.y !== 0 || crop.zoom !== 1 || crop.rotation !== 0;
}
