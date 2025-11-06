import type { RemoveIndexSignature } from './common';
import type { ElementCommonAttrs, ScalarNode } from './core';
import type { TagEventHandlers } from './events';
import type { HtmlRef, RefSetter } from './refs';

/** The list of possible DOM tree node types. */
export type DomNode = Element | Text | Comment;

export type TagAttrValue =
  // Next scalar values will be stringified
  | string
  | number
  | boolean
  // Absent attributes
  | null
  | undefined
  // Event handlers & Tag styles
  | Function
  | TagStyles;

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

/**
 * Returns a list of tag-based properties that can probably be set via a JSX tag
 * node.
 **/
// prettier-ignore
type PropertiesOnly<T extends HTMLElement> = {
  [K in keyof RemoveIndexSignature<T>]:
    K extends `on${string}` ? never
    : ChildNode extends T[K] ? never
    : Element extends T[K] ? never
    : HTMLElement extends T[K] ? never
    : K;
}[keyof RemoveIndexSignature<T>];

// prettier-ignore
type TagNativeProps<T extends HTMLElement> =
  & Partial<Omit<Pick<T, PropertiesOnly<T>>, GeneralRemove>>
  & TagEventHandlers<T>;

// prettier-ignore
export type TagProps<T extends HTMLElement = HTMLElement> =
  & TagNativeProps<T>
  & ElementCommonAttrs
  & {
    ref?: HtmlRef<T> | RefSetter<T | null>;
    style?: string | null | undefined | TagStyles
  }
  & Record<`data-${string}`, ScalarNode>
  & { children?: JSX.Element };

/** A map like { fontSize: '12px' }. */
export type TagStyles =
  & { [K in keyof CSSStyleDeclaration]?: string | number; } // prettier-ignore
  & { [K in `--${string}`]: string | number }; // prettier-ignore

export type SvgRootProps = TagProps<HTMLElement> & {
  xmlns?: string;
  width?: number;
  height?: number;
  viewBox?: string;
};

/**
 * It's a whole world of non-implemented types :(. I haven't found any simple
 * way to get it from the default DOM types, so I left a fallback that at least
 * doesn't block SVG tags.
 */
// prettier-ignore
export type SvgTagProps =
  & { [K in string]?: unknown; }
  & { children?: JSX.Element; }
