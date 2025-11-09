import type { RemapKeys, RemoveIndexSignature } from './common';
import type { TagEventHandlers } from './events';

type ToCamel = {
  autofocus: 'autoFocus';
  autoplay: 'autoPlay';
  autocomplete: 'autoComplete';
  // Form attributes
  readonly: 'readOnly';
  maxlength: 'maxLength';
  minlength: 'minLength';
  // Content attributes
  contenteditable: 'contentEditable';
  spellcheck: 'spellCheck';
  // Media attributes
  crossorigin: 'crossOrigin';
  // Table attributes
  colspan: 'colSpan';
  rowspan: 'rowSpan';
  // Accessibility
  tabindex: 'tabIndex';
  // Form controls
  formaction: 'formAction';
  formenctype: 'formEncType';
  formmethod: 'formMethod';
  formnovalidate: 'formNoValidate';
  formtarget: 'formTarget';
  // Input attributes
  inputmode: 'inputMode';
  // Security
  novalidate: 'noValidate';
  // Loading
  fetchpriority: 'fetchPriority';
};

/**
 * Each HTMLElement contains a ton of properties. Most of them shouldn't be used
 * in JSX tag nodes. This type matches most inapplicable generic properties.
 */
type GeneralRemove =
  | `DOCUMENT_${string}`
  | `${string}_NODE`
  | `client${string}`
  | `offset${string}`
  | `node${string}`
  | `inner${string}`
  | `scroll${string}`
  | `set${string}`
  | `outer${string}`
  | 'children'
  | 'attributes'
  | 'childNodes'
  | 'classList'
  | 'tagName'
  | 'style'
  | `key`
  | `dataset`
  | 'textContent'
  | 'shadowRoot';

type RemapAttrs<T> = RemapKeys<T, ToCamel>;

/**
 * Returns a list of tag-based properties that can probably be set via a JSX tag
 * node.
 **/
type PropertiesOnly<T extends Element> = {
  [K in keyof RemoveIndexSignature<T>]: K extends `on${string}`
    ? never
    : ChildNode extends T[K]
      ? never
      : Element extends T[K]
        ? never
        : HTMLElement extends T[K]
          ? never
          : K;
}[keyof RemoveIndexSignature<T>];

// prettier-ignore
export type TagNativeProps<T extends Element> =
  & { className?: string } // Wrongly typed in SVGElement
  & RemapAttrs<Partial<Omit<Pick<T, PropertiesOnly<T>>, GeneralRemove>>>
  & TagEventHandlers<T>;
