import type { TagAttrValue, TagFiberNode } from 'faiwer-react/types';
import { nullthrows } from 'faiwer-react/utils';

/**
 * Original React has a very special behavior for the "onChange" event:
 * - It treats it as an "onInput" event
 * - If the "value" prop is given and is not `null` or `undefined` it always
 *   ignores the changes. Since HTML doesn't allow us to ignore the changes it
 *   recovers the value asap.
 * - Even if the "value" prop is given and not nil, React still calls the
 *   provided "onChange" handler with the updated event.target.value. It'll be
 *   restored a little later.
 * - React overrides the descriptor of the "value" prop within the given
 *   dom-node to track changes.
 */
export const setValueAttr = (
  fiber: TagFiberNode,
  attrName: 'value' | 'checked',
  attrValue: TagAttrValue,
) => {
  // narrow down the type for simplicity.
  const element = fiber.element as HTMLInputElement;

  // Assuming we keep referring to the same `events` object even after calling
  // `displaceFiber`.
  const { events } = fiber.data;

  if (!events[VALUE_EVENT]) {
    const onInput = setUpStore(element, attrName);
    events[VALUE_EVENT] = {
      name: 'input',
      handler: null,
      capture: false,
      wrapper: onInput,
    };
    element.addEventListener('input', onInput, {
      capture: events[VALUE_EVENT].capture,
    });
  }

  const store = (events[VALUE_EVENT]!.wrapper as HandlerX).__store;
  store.prev = attrValue;
  store.set(toNativeValue(attrName, attrValue));
};

const VALUE_EVENT = 'x:input';

const setUpStore = (
  element: HTMLInputElement,
  attrName: 'value' | 'checked',
): HandlerX => {
  const original = nullthrows(
    Object.getOwnPropertyDescriptor(element.constructor.prototype, attrName),
  );

  const store: Store = {
    prev: null,
    set: original.set!.bind(element),
  };

  Object.defineProperty(element, attrName, {
    ...original,
    set: (newValue: unknown) => {
      original.set!.call(element, toNativeValue(attrName, newValue));
      // Original React doesn't do it, but why not?
      element.dispatchEvent(new InputEvent('input'));
    },
  });

  const onInput: HandlerX = () => {
    const newValue = toNativeValue(attrName, element[attrName]);
    if (store.prev == null) return; // = uncontrolled component.
    if (store.prev === newValue) return; // = not a real change.

    setTimeout(() => {
      // Repeat the check because it could change in between.
      if (store.prev !== newValue) {
        // Recover the previous value, because this is a "controlled" element.
        original.set!.call(element, store.prev);
      }
    }, 0);
  };

  onInput.__store = store;
  return onInput;
};

/**
 * value: null | undefined -> ''
 * checked: whatever -> boolean
 */
const toNativeValue = (
  attrName: 'checked' | 'value',
  newValue: unknown,
): boolean | string =>
  attrName === 'checked'
    ? !!newValue
    : newValue == null
      ? '' // not "null"
      : String(newValue);

type Store = {
  /** The value from the user's code. */
  prev: TagAttrValue;
  /** Original input.value | input.checked setter. Before overriding. */
  set: (v: unknown) => void;
};

type HandlerX = EventListener & {
  __store: Store;
};
