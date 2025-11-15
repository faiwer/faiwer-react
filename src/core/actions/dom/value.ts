import { getAppByFiber } from 'faiwer-react/core/reconciliation/app';
import { scheduleEffect } from 'faiwer-react/core/reconciliation/effects';
import type { App, TagAttrValue, TagFiberNode } from 'faiwer-react/types';
import { nullthrows } from 'faiwer-react/utils';

const stores = new WeakMap<Element, Store>();

/**
 * Original React has a very special behavior for the "onChange" event:
 * - It treats "onChange" as an "onInput" event for form controls
 * - If the "value" prop is provided and is not `null` or `undefined`, React
 *   treats the input as "controlled" and ignores user changes by restoring the
 *   original value after each input event
 * - Even for controlled inputs, React still calls the "onChange" handler with
 *   the updated event.target.value before restoring the previous value
 * - React overrides the property descriptor of the "value" property on the DOM
 *   element to intercept and track all value changes
 */
export const setValueAttr = (
  fiber: TagFiberNode,
  attrName: 'value' | 'checked',
  attrValue: TagAttrValue,
) => {
  // Narrow down the type for simplicity.
  const element = fiber.element as HTMLInputElement;

  // We continue to reference the same `events` object even after calling
  // `displaceFiber`, so this assumption should hold
  const { events } = fiber.data;

  if (!events[VALUE_EVENT]) {
    const app = getAppByFiber(fiber);
    const store = setUpStore(element, attrName);

    const onInput = createOnInputHandler(
      app,
      element,
      attrName,
      store,
    ) as EventListener;

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

  const store = nullthrows(stores.get(element));
  store.prev = attrValue;
  store.set(toNativeValue(attrName, attrValue), 'restore');
};

const VALUE_EVENT = 'x:input';

const setUpStore = (
  element: HTMLInputElement,
  attrName: 'value' | 'checked',
): Store => {
  const original = nullthrows(
    Object.getOwnPropertyDescriptor(element.constructor.prototype, attrName),
  );

  const store: Store = {
    prev: null,
    cursor: null,
    set: (value: unknown, cursor: 'ignore' | 'preserve' | 'restore') => {
      if (attrName === 'value' && cursor === 'preserve') {
        store.cursor = element.selectionStart;
      }

      original.set!.call(element, value);

      if (
        attrName === 'value' &&
        cursor === 'restore' &&
        store.cursor != null
      ) {
        element.selectionStart = element.selectionEnd = store.cursor;
      }
    },
  };

  Object.defineProperty(element, attrName, {
    ...original,
    set: (newValue: unknown) => {
      original.set!.call(element, toNativeValue(attrName, newValue));
      // Unlike original React, we also dispatch an input event for better consistency
      element.dispatchEvent(new InputEvent('input'));
    },
  });

  stores.set(element, store);
  return store;
};

const createOnInputHandler = (
  app: App,
  element: HTMLInputElement,
  attrName: 'value' | 'checked',
  store: Store,
) => {
  return function onInput() {
    if (element.type === 'radio' && element.name) {
      // Radio buttons require special group-based handling
      onRadioClick(app, element);
      return;
    }

    const newValue = element[attrName];
    if (store.prev == null) return; // Uncontrolled component - allow changes
    if (store.prev === newValue) return; // No actual change occurred

    scheduleResetValueEffect(app, () => {
      // Restore the previous value since this is a controlled element
      store.set(store.prev, 'preserve');
    });
  };
};

/**
 * Radio button group handling:
 *
 * - Browsers don't emit "change" or "input" events for radio buttons that lose
 *   their "checked" state when another radio in the group is selected. The
 *   state change happens silently.
 * - When a user selects a different radio button, the browser only emits an
 *   "input" event for the newly selected button. The event provides no
 *   information about which radio button was previously active.
 * - Radio buttons form a group when they share the same "name" attribute within
 *   their containing <form> (or document if no form exists).
 *
 * This function enforces React's "controlled component" behavior for radio
 * button groups. If any radio button in the group has "checked=true", all other
 * radio buttons in the group must have "checked=false", even if they don't
 * explicitly define a "checked" attribute (React assumes they do).
 */
const onRadioClick = (app: App, element: HTMLInputElement): void => {
  scheduleResetValueEffect(app, () => {
    // Find all radio buttons in the same group (same name within the form)
    const form = element.closest('form') ?? (app.root.element as HTMLElement);
    const radios = form.querySelectorAll(`input[type="radio"]`);
    // Look for a radio button that was previously controlled with checked=true
    for (let i = 0; i < radios.length; ++i) {
      const radio = radios[i] as HTMLInputElement;
      if (radio.name === element.name && stores.get(radio)?.prev === true) {
        // Restore the previously checked radio button's state, which will
        // automatically uncheck the currently selected one. The correct state
        // will be updated in the next render if setState was called from the
        // user's onChange handler
        stores.get(radio)!.set(true, 'ignore');
        return;
      }
    }

    const store = stores.get(element)!;
    if (typeof store?.prev === 'boolean') {
      // A single uncontrolled radio button with checked="false".
      store.set(store.prev, 'ignore');
    }
  });
};

/**
 * Converts React prop values to native DOM values:
 * - value: null | undefined → '' (empty string, not "null")
 * - checked: any value → boolean conversion
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
  /** The value from the user's React code */
  prev: TagAttrValue;
  /** Original DOM setter method before our override */
  set: (v: unknown, cursor: 'ignore' | 'preserve' | 'restore') => void;
  /** User's cursor position before the prev rendered value restoration. */
  cursor: number | null;
};

/**
 * Schedules value restoration for controlled form elements.
 *
 * React maintains the value attribute for "controlled" HTML form controls,
 * where only setState and subsequent renders can update their value. However,
 * there's a brief window between the "onInput" event and the DOM/React render
 * where the new value hasn't been reset yet. This function ensures the callback
 * runs at the appropriate time to restore the controlled value.
 */
const scheduleResetValueEffect = (app: App, fn: () => void) => {
  let executed = false;

  requestAnimationFrame(() => {
    if (!executed) {
      executed = true;
      fn();
    }
  });

  scheduleEffect(
    app,
    () => {
      if (!executed) {
        executed = true;
        fn();
      }
    },
    'beforeRender',
  );
};
