// Une préférence de création uniquement : jamais appliquée aux états déjà enregistrés.
export function newStateVisibility(page) {
  return Object.fromEntries(page.buttons.filter(button => typeof button.futureStateVisibility === 'boolean').map(button => [button.id, button.futureStateVisibility]));
}

export function applyButtonStateVisibility(page, buttonId, visible) {
  return {
    ...page,
    states: page.states.map(state => ({ ...state, visibility: { ...state.visibility, [buttonId]: visible } })),
    buttons: page.buttons.map(button => button.id === buttonId && typeof button.futureStateVisibility === 'boolean' ? { ...button, futureStateVisibility: visible } : button),
  };
}

export function validateStateVisibility(document) {
  for (const page of document.pages) for (const button of page.buttons || []) {
    if (button.futureStateVisibility !== undefined && typeof button.futureStateVisibility !== 'boolean') {
      throw new Error('La visibilité du bouton dans les nouveaux états est invalide. La présentation actuelle est conservée.');
    }
  }
}

