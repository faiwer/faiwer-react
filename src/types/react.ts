import type { ReactContext } from './context';
import { type ReactComponent } from './component';
import type { ElementCommonAttrs, UnknownProps } from './core';
import type { EventHandler, PatchEvent } from './events';
import type { TagNativeProps } from './attributes';
import type { TagProps, TagStyles } from './dom';
import type { HtmlRef, RefSetter } from './refs';

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
export type ErrorInfo = {
  componentStack: string | null;
  digest?: string | null;
};

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
  & { ref?: HtmlRef<T> | RefSetter<T | null>; }
  & ElementCommonAttrs; // prettier-ignore
