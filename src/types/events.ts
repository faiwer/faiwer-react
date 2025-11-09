import type { RemapKeys, RemoveIndexSignature } from './common';

type EventHandler<E extends Event> = (event: E) => void;

// prettier-ignore
type DomEventHandlerX<E extends string> =
  E extends `ondrag${string}` ? EventHandler<DragEvent>
  : E extends `onmouse${string}` ? EventHandler<MouseEvent>
  : E extends `onkey${string}` ? EventHandler<KeyboardEvent>
  : E extends `onfocus` | `onblur` ? EventHandler<FocusEvent>
  : E extends `onwheel` ? EventHandler<WheelEvent>
  : E extends 'onclick' | `onpointer${string}` ? EventHandler<PointerEvent>
  : E extends `ontouch${string}` ? EventHandler<TouchEvent>
  : E extends `onanimation${string}` ? EventHandler<AnimationEvent>
  : E extends `ontransition${string}` ? EventHandler<TransitionEvent>
  : E extends `onload` | `onerror` | `onabort` ? EventHandler<ProgressEvent>
  : EventHandler<Event>;

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
  [K in EventKeys<T>]: DomEventHandlerX<K>;
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
