import type { ReactContext } from './context';
import { type ReactComponent } from './component';
import type { UnknownProps } from './core';
import type { EventHandler, PatchEvent } from './events';
import type { TagNativeProps } from './attributes';

//
// Core
//
export type FC<Props extends UnknownProps = UnknownProps> =
  ReactComponent<Props>;
export type ReactNode = JSX.Element;
export type Context<T> = ReactContext<T>;
export type CSSProperties = Partial<CSSStyleDeclaration>;
export type ComponentType<Props extends UnknownProps = UnknownProps> =
  ReactComponent<Props>;
export type ForwardRefExoticComponent<
  Props extends UnknownProps = UnknownProps,
> = FC<Props>;

//
// Events
//
// prettier-ignore
export type SyntheticEvent<T = Element, E = Event> =
  & Omit<E, 'target'>
  & {
    nativeEvent: E;
    // TODO: add support
    target: T; // by default it's nullable
  };
export type ClipboardEvent<T = Element> =
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
  TagNativeProps<T>;
export type InputHTMLAttributes<T extends Element = HTMLInputElement> =
  TagNativeProps<T>;
