import { useState } from 'react';

// Même comportement dans l’éditeur et le lecteur ; l’état de lecture reste local.
export default function useSlideInteraction(page) {
  const [selections, setSelections] = useState({});
  function forPage(page) {
    const selection = page && selections[page.id];
    const validSelection = selection &&
      (!selection.buttonId || page.buttons.some(button => button.id === selection.buttonId)) &&
      (selection.target?.kind !== 'variant' || page.variants.some(variant => variant.id === selection.target.variantId));
    const target = validSelection ? selection.target : page?.defaultBackground;
    const activeButtonId = validSelection ? selection.buttonId : null;
    function choose(target, buttonId = null) {
      if (page) setSelections(previous => ({ ...previous, [page.id]: { target, buttonId } }));
    }
    function activateButton(button) { if (button.target) choose(button.target, button.id); }
    function reset() { if (page) setSelections(previous => { const next = { ...previous }; delete next[page.id]; return next; }); }
    return { target, activeButtonId, choose, activateButton, reset };
  }
  return { ...forPage(page), forPage };
}
