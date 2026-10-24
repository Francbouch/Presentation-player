export const afterPlaybackEnabled = (action) =>
  action?.type === "layerVideo" &&
  !!action.afterPlayback?.enabled &&
  ["restart", "resume"].includes(action.command);
export function layerVideoCompletionProblem(page, action) {
  if (!afterPlaybackEnabled(action)) return "";
  if (!action.layerIds.length) return "Choisissez au moins un calque vidéo.";
  if (
    action.layerIds.some(
      (id) => page.layers.find((l) => l.id === id)?.frameMedia?.playback?.loop,
    )
  )
    return "Désactivez la boucle des vidéos ciblées pour utiliser une action après la lecture.";
  if (!page.states.some((s) => s.id === action.afterPlayback.stateId))
    return action.afterPlayback.missingStateId
      ? "État cible introuvable. Choisissez un autre état."
      : "Choisissez un état de page après la lecture.";
  return "";
}
export function normalizeAfterPlayback(action, stateIds) {
  const after = action.afterPlayback;
  return after?.stateId && !stateIds.has(after.stateId)
    ? {
        ...action,
        afterPlayback: {
          ...after,
          missingStateId: after.stateId,
          stateId: null,
        },
      }
    : action;
}
// Subscribe to real ends, exactly once, and detach every callback on cancellation.
export function watchLayerVideoEnds(players, finish, cancelled) {
  const remaining = new Set(players),
    subscriptions = [];
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    subscriptions.splice(0).forEach((unsubscribe) => unsubscribe());
  };
  for (const player of players)
    subscriptions.push(
      player.watchEnd(
        () => {
          if (closed) return;
          remaining.delete(player);
          if (!remaining.size) {
            close();
            finish();
          }
        },
        (reason) => {
          if (closed) return;
          close();
          cancelled?.(reason);
        },
      ),
    );
  return close;
}
