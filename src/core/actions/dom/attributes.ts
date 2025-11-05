import type { TagAttrValue } from 'faiwer-react/types';

export const setHtmlAttribute = (
  element: HTMLElement,
  name: string,
  value: TagAttrValue,
) => {
  if (BOOL_ATTRS.has(name)) {
    if (value) {
      element.setAttribute(name, '');
    } else {
      element.removeAttribute(name);
    }
    return;
  }

  element.setAttribute(name === 'className' ? 'class' : name, String(value));
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
  'value',
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
  'capture',
  'download',
  'inert',
]);
