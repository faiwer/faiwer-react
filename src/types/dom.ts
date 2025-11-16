import type { TagNativeProps } from './attributes';
import type { ReplaceIn } from './common';
import type { ElementCommonAttrs, ScalarNode } from './core';
import type { Ref } from './refs';

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

type Overrides<T extends Element, O> = T extends
  | HTMLInputElement
  | HTMLTextAreaElement
  ? ReplaceIn<
      O,
      { value?: string | number } & {
        defaultValue?: string | number;
        defaultChecked?: boolean;
      }
    >
  : T extends HTMLSelectElement
    ? ReplaceIn<O, { value?: string | number | Array<number | string> }> & {
        defaultValue?: string | string[] | number;
      }
    : T extends HTMLOptionElement
      ? ReplaceIn<O, { value?: string | number }>
      : O;

// prettier-ignore
export type TagProps<T extends Element = HTMLElement> =
  Overrides<T,
    & TagNativeProps<T>
    & ElementCommonAttrs
    & {
      ref?: Ref<T>;
      style?: string | null | undefined | TagStyles
    }
    & Record<`data-${string}`, ScalarNode>
    & { children?: JSX.Element }
  >

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
