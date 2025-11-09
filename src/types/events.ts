import type { RemapKeys, RemoveIndexSignature } from './common';

type PatchEvent<T extends Element, E extends Event> = E & { target: T };

export type EventHandler<T extends Element, E extends Event> = (
  event: PatchEvent<T, E>,
) => void;

// prettier-ignore
type DomEventHandlerX<T extends Element, E extends string> =
  E extends `ondrag${string}` ? EventHandler<T, DragEvent>
  : E extends `onmouse${string}` ? EventHandler<T, MouseEvent>
  : E extends `onkey${string}` ? EventHandler<T, KeyboardEvent>
  : E extends `onfocus` | `onblur` ? EventHandler<T, FocusEvent>
  : E extends `onwheel` ? EventHandler<T, WheelEvent>
  : E extends 'onclick' | `onpointer${string}` ? EventHandler<T, PointerEvent>
  : E extends `ontouch${string}` ? EventHandler<T, TouchEvent>
  : E extends `onanimation${string}` ? EventHandler<T, AnimationEvent>
  : E extends `ontransition${string}` ? EventHandler<T, TransitionEvent>
  : E extends `onload` | `onerror` | `onabort` ? EventHandler<T, ProgressEvent>
  : EventHandler<T, Event>;

// prettier-ignore
type ToCamelCase<T extends string> = T extends `onmouse${infer Rest}`
  ? `onMouse${Capitalize<Rest>}`
  : T extends `onfullscreen${infer Rest}` ? `onFullscreen${Capitalize<Rest>}`
  : T extends `onkey${infer Rest}` ? `onKey${Capitalize<Rest>}`
  : T extends `ondrag${infer Rest}` ? `onDrag${Capitalize<Rest>}`
  : T extends `ontouch${infer Rest}` ? `onTouch${Capitalize<Rest>}`
  : T extends `onpointer${infer Rest}` ? `onPointer${Capitalize<Rest>}`
  : T extends `onanimation${infer Rest}` ? `onAnimation${Capitalize<Rest>}`
  : T extends `ontransition${infer Rest}` ? `onTransition${Capitalize<Rest>}`
  : T extends `oncanplay${infer Rest}` ? `onCanPlay${Capitalize<Rest>}`
  : T extends `on${infer Rest}` ? `on${Capitalize<Rest>}`
  : T; // fallback

// 'onclick' | 'onmousedown' | …
type EventKeys<T extends Element> = {
  [K in keyof RemoveIndexSignature<T>]: K extends `on${string}` ? K : never;
}[keyof RemoveIndexSignature<T>];

// { onclick: (evt: PointerEvent) => void }
type EventHandlers<T extends Element> = {
  [K in EventKeys<T>]: DomEventHandlerX<T, K>;
};

// { onclick: onClick, … }
type mapLowerCaseToCamelCase<T extends Element> = {
  [K in EventKeys<T>]: ToCamelCase<K>;
};

/**
 * A map of events for the given HTMLElement-based type
 * @example
 * { onClick: (evt: PointerEvents) => void }
 */
export type TagEventHandlers<T extends Element> = RemapKeys<
  EventHandlers<T>,
  mapLowerCaseToCamelCase<RemoveIndexSignature<T>>
>;
