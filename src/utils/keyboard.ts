/**
 * Keyboard-shortcut helpers.
 *
 * Global app shortcuts must never fire while the user is typing in an
 * editable control, and must never seize browser-reserved combinations.
 */

/**
 * Returns true when the event target is an editable element (text input,
 * textarea, select, or a contenteditable node). Shortcut handlers should
 * bail early on these so native editing behaviour is preserved.
 */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable === true;
}
