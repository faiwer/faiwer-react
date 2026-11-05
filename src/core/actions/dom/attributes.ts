import type { TagAttrValue } from 'faiwer-react/types';

export const setHtmlAttribute = (
  element: HTMLElement,
  name: string,
  value: TagAttrValue,
) => {
  // A flag (`download`, `download={true}`) and a filename (`download="1.txt"`)
  // are both valid. `true` is the flag; any other present value is the filename.
  if (OVERLOADED_BOOL_ATTRS.has(name)) {
    setOverloadedBoolAttr(element, name, value);
    return;
  }

  if (BOOL_ATTRS.has(name)) {
    if (value) {
      element.setAttribute(name, '');
    } else {
      element.removeAttribute(name);
    }
    return;
  }

  if (name === 'value') {
    (element as HTMLInputElement).value = value == null ? '' : String(value);
    return;
  }

  element.setAttribute(name === 'className' ? 'class' : name, String(value));
};

/**
 * Boolean attributes that also accept a string. `true` renders the attribute
 * with an empty value, `false` / `null` remove it, and any other value is
 * written through (`download="notes.txt"`, `capture="user"`).
 */
export const OVERLOADED_BOOL_ATTRS = new Set(['capture', 'download']);

const setOverloadedBoolAttr = (
  element: HTMLElement,
  name: string,
  value: TagAttrValue,
) => {
  if (value === true) {
    if (element.getAttribute(name) !== '') {
      element.setAttribute(name, '');
    }
    return;
  }

  if (value === false || value == null) {
    element.removeAttribute(name);
    return;
  }

  const strValue = String(value);
  if (strValue !== element.getAttribute(name)) {
    element.setAttribute(name, strValue);
  }
};

export const BOOL_ATTRS = new Set([
  'autoFocus',
  'checked',
  'multiple',
  'muted',
  'selected',
  'contentEditable',
  'spellCheck',
  'draggable',
  'autoReverse',
  'externalResourcesRequired',
  'focusable',
  'preserveAlpha',
  'allowFullScreen',
  'async',
  'autoPlay',
  'controls',
  'default',
  'defer',
  'disabled',
  'disablePictureInPicture',
  'disableRemotePlayback',
  'formNoValidate',
  'hidden',
  'loop',
  'noModule',
  'noValidate',
  'open',
  'playsInline',
  'readOnly',
  'required',
  'reversed',
  'scoped',
  'seamless',
  'itemScope',
  'inert',
]);
