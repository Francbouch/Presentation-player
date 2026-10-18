export function defaultAction(type, target = null) {
  return ({ background: { type, target }, visibility: { type, layerIds: [], mode: 'toggle' }, video: { type, videoId: null, block: true, end: 'return', finalBackground: null, pageId: null }, navigate: { type, pageId: null, transitionId: null }, state: { type, stateId: null } })[type] || null;
}

export function normalizeActions(page, pageIds) {
  const ids = new Set([...(page.layers || []), ...page.buttons].map(item => item.id));
  const stateIds = new Set((page.states || []).map(state => state.id));
  const target = value => value?.kind === 'variant' && !page.variants.some(item => item.id === value.variantId) ? null : value;
  const action = value => {
    if (!value) return null;
    if (value.type === 'background') { const next = target(value.target); return next ? { ...value, target: next } : null; }
    if (value.type === 'visibility') return { ...value, layerIds: value.layerIds.filter(id => ids.has(id)), ...(value.targetModes?{targetModes:Object.fromEntries(Object.entries(value.targetModes).filter(([id])=>ids.has(id)&&value.layerIds.includes(id)))}:{}) };
    if (value.type === 'state') return { ...value, stateId: stateIds.has(value.stateId) ? value.stateId : null };
    if (value.type === 'video') return { ...value, ...(value.finalStateId && !stateIds.has(value.finalStateId) ? {missingFinalStateId:value.finalStateId,finalStateId:null} : {}), finalBackground: target(value.finalBackground), ...(value.pageId && pageIds && !pageIds.has(value.pageId) ? { missingPageId: value.pageId } : {}), pageId: pageIds && !pageIds.has(value.pageId) ? null : value.pageId };
    if (value.type === 'navigate') return { ...value, ...(value.pageId && pageIds && !pageIds.has(value.pageId) ? { missingPageId: value.pageId } : {}), pageId: pageIds && !pageIds.has(value.pageId) ? null : value.pageId };
    return value;
  };
  return { ...page,
    buttons: page.buttons.map(button => {
      const next = action(button.action === undefined ? (button.target ? defaultAction('background', button.target) : null) : button.action);
      return { ...button, action: next, target: next?.type === 'background' ? next.target : target(button.target) };
    }),
    states: (page.states || []).map(state => ({ ...state, background: target(state.background), visibility: Object.fromEntries(Object.entries(state.visibility).filter(([id]) => ids.has(id))), activeButtonId: page.buttons.some(button => button.id === state.activeButtonId) ? state.activeButtonId : null })),
    initialStateId: stateIds.has(page.initialStateId) ? page.initialStateId : null,
  };
}

export function actionMedia(page) {
  const background = target => target?.kind === 'media' ? target.mediaId : null;
  return [...page.buttons.flatMap(button => [background(button.action?.target), button.action?.videoId, button.action?.transitionId, background(button.action?.finalBackground)]), ...(page.states || []).map(state => background(state.background))];
}

export function validateActions(document, ref) {
  const fail = () => { throw new Error('La configuration des actions ou des états est invalide. La présentation actuelle est conservée.'); };
  const pageIds = new Set(document.pages.map(page => page.id));
  for (const page of document.pages) {
    if (!Array.isArray(page.states) || !('initialStateId' in page)) fail();
    const layerIds = new Set(page.layerOrder);
    const stateIds = new Set();
    const background = target => target === null || target?.kind === 'main' || target?.kind === 'initial' || (target?.kind === 'media' && target.mediaId !== null && ref(target.mediaId, 'image')) || (target?.kind === 'variant' && page.variants.some(item => item.id === target.variantId));
    for (const state of page.states) {
      if (!state || typeof state.id !== 'string' || !state.id || stateIds.has(state.id) || typeof state.name !== 'string' || state.name.length > 80 || !background(state.background) || state.background?.kind === 'initial' || !state.visibility || typeof state.visibility !== 'object' || Array.isArray(state.visibility) || Object.entries(state.visibility).some(([id, value]) => !layerIds.has(id) || typeof value !== 'boolean') || (state.activeButtonId !== null && !page.buttons.some(button => button.id === state.activeButtonId))) fail();
      stateIds.add(state.id);
    }
    if (page.initialStateId !== null && !stateIds.has(page.initialStateId)) fail();
    for (const button of page.buttons) {
      if (!('action' in button)) fail();
      const action = button.action;
      if (action === null) continue;
      if (!action || !['background', 'visibility', 'video', 'navigate', 'state'].includes(action.type)) fail();
      if (action.type === 'background' && !background(action.target)) fail();
      if (action.type === 'visibility' && (!Array.isArray(action.layerIds) || new Set(action.layerIds).size !== action.layerIds.length || action.layerIds.some(id => !layerIds.has(id)) || !(document.version>=9?['show','hide','toggle','custom']:['show','hide','toggle']).includes(action.mode) || action.targetModes!==undefined && (!action.targetModes || typeof action.targetModes!=='object' || Array.isArray(action.targetModes) || Object.entries(action.targetModes).some(([id,mode])=>!action.layerIds.includes(id)||!['show','hide','toggle'].includes(mode))))) fail();
      if (action.type === 'state' && action.stateId !== null && !stateIds.has(action.stateId)) fail();
      if (action.type === 'navigate' && (!ref(action.transitionId, 'video') || (action.pageId !== null && !pageIds.has(action.pageId)))) fail();
      if (action.type === 'video' && action.finalStateId !== undefined && action.finalStateId !== null && !stateIds.has(action.finalStateId)) fail();
      if (action.type === 'video' && action.end === 'state' && action.finalStateId === undefined) fail();
      if (action.type === 'video' && (!ref(action.videoId, 'video') || typeof action.block !== 'boolean' || !(document.version>=12?['return','image','page','state']:['return','image','page']).includes(action.end) || !background(action.finalBackground) || (action.pageId !== null && !pageIds.has(action.pageId)))) fail();
    }
  }
}
