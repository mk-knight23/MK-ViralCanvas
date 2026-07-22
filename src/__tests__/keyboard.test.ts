import { describe, it, expect } from 'vitest';
import { isEditableTarget } from '@/utils/keyboard';

describe('isEditableTarget', () => {
  it('returns true for a text input', () => {
    expect(isEditableTarget(document.createElement('input'))).toBe(true);
  });

  it('returns true for a textarea', () => {
    expect(isEditableTarget(document.createElement('textarea'))).toBe(true);
  });

  it('returns true for a select', () => {
    expect(isEditableTarget(document.createElement('select'))).toBe(true);
  });

  it('returns true for a contenteditable element', () => {
    const el = document.createElement('div');
    Object.defineProperty(el, 'isContentEditable', { value: true });
    expect(isEditableTarget(el)).toBe(true);
  });

  it('returns false for a button', () => {
    expect(isEditableTarget(document.createElement('button'))).toBe(false);
  });

  it('returns false for a non-editable div', () => {
    expect(isEditableTarget(document.createElement('div'))).toBe(false);
  });

  it('returns false for null', () => {
    expect(isEditableTarget(null)).toBe(false);
  });
});
