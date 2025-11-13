import { getAppByFiber } from 'faiwer-react/core/reconciliation/app';
import type { App, TagAttrValue, TagFiberNode } from 'faiwer-react/types';
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
export const setValueAttr = (fiber: TagFiberNode, value: TagAttrValue) => {
  const element = fiber.element as HTMLInputElement | HTMLTextAreaElement;

  // Assuming we keep referring to the same `events` object even after calling
  // `displaceFiber`.
  const { events } = fiber.data;
  const app = getAppByFiber(fiber);

  if (!events[VALUE_EVENT] && value != null) {
    const onInput = setUpStore(app, element);
    events[VALUE_EVENT] = {
      name: 'input',
      handler: null,
      capture: true,
      wrapper: onInput,
    };
    element.addEventListener('input', onInput, {
      capture: events[VALUE_EVENT].capture,
    });
  }

  const store = (events[VALUE_EVENT]?.wrapper as HandlerX)?.__store;
  if (store) {
    store.prev = value;
    store.set(String(value));
  }
};

const VALUE_EVENT = 'x:input';

const setUpStore = (
  app: App,
  element: HTMLInputElement | HTMLTextAreaElement,
): HandlerX => {
  const original = nullthrows(
    Object.getOwnPropertyDescriptor(element.constructor.prototype, 'value'),
  );

  const store: Store = {
    prev: null,
    set: original.set!.bind(element),
  };

  Object.defineProperty(element, 'value', {
    ...original,
    set: (value: unknown) => {
      original.set!.call(element, String(value));
      // Original React doesn't do it, but why not?
      element.dispatchEvent(new InputEvent('input'));
    },
  });

  const onInput: HandlerX = () => {
    if (store.prev == null || store.prev === element.value) {
      return;
    }
    queueMicrotask(() => {
      // Repeat the check because it could change in between.
      if (store.prev !== null && element.value !== store.prev) {
        // Recover the previous value, because this is a "controlled" element.
        original.set!.call(element, String(store.prev));
      }
    });
  };

  onInput.__store = store;
  return onInput;
};

type Store = {
  prev: TagAttrValue;
  set: (v: unknown) => void;
};

type HandlerX = EventListener & {
  __store: Store;
};
