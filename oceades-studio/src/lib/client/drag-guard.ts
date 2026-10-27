/**
 * Après un glisser-déposer, le navigateur déclenche un « click » sur l'élément relâché.
 * On l'ignore pour ne pas ouvrir la fiche d'une carte qu'on vient de déplacer.
 */
let lastDragEnd = 0;

export function markDragEnd() {
  lastDragEnd = Date.now();
}

export function justDragged(): boolean {
  return Date.now() - lastDragEnd < 300;
}
