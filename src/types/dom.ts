import type { TagNativeProps } from './attributes';
import type { ElementCommonAttrs, ScalarNode } from './core';
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

// prettier-ignore
export type TagProps<T extends Element = HTMLElement> =
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
  & { [K in `--${string}`]: string | number | null }; // prettier-ignore

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
