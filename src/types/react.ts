import type { ReactContext } from './context';
import { type ReactComponent } from './component';
import type { ElementCommonAttrs, UnknownProps } from './core';
import type { EventHandler, PatchEvent } from './events';
import type { TagNativeProps } from './attributes';
import type { TagProps, TagStyles } from './dom';
import type { Ref } from './refs';

//
// Core
//
export type FC<Props extends UnknownProps = UnknownProps> =
  ReactComponent<Props>;
export type ReactNode = JSX.Element;
export type Context<T> = ReactContext<T>;
export type CSSProperties = TagStyles;
export type ComponentType<Props extends UnknownProps = UnknownProps> =
  ReactComponent<Props>;
export type ForwardRefExoticComponent<
  Props extends UnknownProps = UnknownProps,
> = FC<Props>;

//
// Events
//
export type SyntheticEvent<
  T extends Element = Element,
  E extends Event = Event,
> = PatchEvent<T, E>;
export type ClipboardEvent<T extends Element = Element> =
  & SyntheticEvent<T>
  & { clipboardData: DataTransfer; }; // prettier-ignore
export type FormEvent<T extends Element = Element> = SyntheticEvent<T>;
export type ChangeEvent<T extends Element = Element> =
  & Omit<SyntheticEvent<T>, 'target'>
  & { target: EventTarget & T; }; // prettier-ignore
export type ChangeEventHandler<T extends Element = Element> =
  EventHandler<T, Event>; // prettier-ignore
export type KeyboardEvent<T extends Element = Element> =
  PatchEvent<T, globalThis.KeyboardEvent>; // prettier-ignore
export type ReactEventHandler<T extends Element = Element> =
  EventHandler<T, Event>; // prettier-ignore

//
// Attributes
//

export type HTMLAttributes<T extends Element> = TagNativeProps<T>;
export type TextareaHTMLAttributes<T extends Element = HTMLTextAreaElement> =
  TagProps<T>;
export type InputHTMLAttributes<T extends Element = HTMLInputElement> =
  TagProps<T>;
export type RefAttributes<T extends Element> =
  & { ref?: Ref<T>; }
  & ElementCommonAttrs; // prettier-ignore

/**
 * Mirrors `React.ClassAttributes<T>` from @types/react. Upstream defines it as
 * `interface ClassAttributes<T> extends RefAttributes<T> {}`, i.e. an alias
 * for the ref/key bag. Plenty of third-party libs (AntD, rc-component,
 * floating-ui) reach for it as a generic parameter constraint, so we expose
 * the same shape.
 */
export type ClassAttributes<T extends Element> = RefAttributes<T>;

/**
 * Mirrors `React.AllHTMLAttributes<T>` from @types/react. Upstream's version is
 * a giant union of every per-element HTML attribute (input's `checked`, form's
 * `action`, video's `autoPlay`, …) so `HTMLProps<T>` can accept any of them
 * regardless of `T`. This lib already derives per-element props from the DOM
 * lib types, so the closest practical equivalent is the full native-props bag
 * for `T` itself.
 */
export type AllHTMLAttributes<T extends Element> = TagNativeProps<T>;

/**
 * Mirrors `React.HTMLProps<T>` from @types/react: interface HTMLProps<T>
 * extends AllHTMLAttributes<T>, ClassAttributes<T> i.e. every HTML attribute
 * available on `T`, plus `ref` and `key`, plus the JSX-intrinsic extras
 * (`style`, `children`, `dangerouslySetInnerHTML`). Generic-default falls back
 * to `HTMLElement` to match upstream ergonomics (`HTMLProps<HTMLDivElement>`
 * works, bare `HTMLProps` works too).
 */
export type HTMLProps<T extends Element = HTMLElement> = TagProps<T>;

/**
 * Mirrors `React.DetailedHTMLProps<E, T>` from @types/react: type
 * DetailedHTMLProps<E extends HTMLAttributes<T>, T> = ClassAttributes<T> & E
 * Used as the value type of every entry in `JSX.IntrinsicElements` upstream
 * (`a: DetailedHTMLProps<AnchorHTMLAttributes<HTMLAnchorElement>,
 * HTMLAnchorElement>`).
 *
 * Note: upstream constrains `E extends HTMLAttributes<T>`, which works because
 * its `InputHTMLAttributes<T> extends HTMLAttributes<T>`. In this lib, the
 * `*HTMLAttributes<T>` aliases are based on `TagProps<T>` (the JSX prop bag,
 * with overrides like `defaultValue: string | number`), so they are NOT a
 * structural subtype of `HTMLAttributes<T> = TagNativeProps<T>` (raw native
 * attrs, `defaultValue: string`). Constraining `E` here would reject every
 * real-world use of `DetailedHTMLProps<InputHTMLAttributes<…>, …>`, so we drop
 * the constraint and keep the public shape (`ClassAttributes<T> & E`).
 */
export type DetailedHTMLProps<E, T extends Element> = ClassAttributes<T> & E;
