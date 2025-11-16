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
  const element = fiber.element as FormControl;

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
  if (attrValue != null) {
    store.set(toNativeValue(attrName, attrValue), true);
  }
};

const VALUE_EVENT = 'x:input';

const setUpStore = (
  element: FormControl,
  attrName: 'value' | 'checked',
): Store => {
  const original = nullthrows(
    Object.getOwnPropertyDescriptor(element.constructor.prototype, attrName),
  );

  const store: Store = {
    prev: null,
    cursor: null,
    set: (value: unknown, restoreCursor = false) => {
      if (
        Array.isArray(value) &&
        element instanceof HTMLSelectElement &&
        element.multiple
      ) {
        setMultuSelectValue(element, value);
        return;
      }

      if (element[attrName as keyof typeof element] === value) {
        // Don't touch the value to avoid moving the cursor.
        return;
      }

      // Non-reactively update the native value.
      original.set!.call(element, value);

      if (
        (element instanceof HTMLInputElement ||
          element instanceof HTMLTextAreaElement) &&
        attrName === 'value' &&
        restoreCursor &&
        store.cursor != null
      ) {
        element.selectionStart = element.selectionEnd = store.cursor;
      }
    },
  };

  stores.set(element, store);
  return store;
};

const createOnInputHandler = (
  app: App,
  element: FormControl,
  attrName: 'value' | 'checked',
  store: Store,
) => {
  return function onInput() {
    if (
      element instanceof HTMLInputElement &&
      element.type === 'radio' &&
      element.name
    ) {
      // Radio buttons require special group-based handling
      onRadioClick(app, element);
      return;
    }

    const newValue = element[attrName as keyof typeof element];
    if (store.prev == null) return; // Uncontrolled component - allow changes
    if (store.prev === newValue) return; // No actual change occurred

    scheduleResetValueEffect(app, () => {
      // The following render could make the control uncontrolled. In such a
      // case we shouldn't restore the value. Now it's in free flight.
      if (store.prev == null) return;

      if (
        (element instanceof HTMLInputElement ||
          element instanceof HTMLTextAreaElement) &&
        attrName === 'value'
      ) {
        store.cursor = element.selectionStart;
      }
      // Restore the previous value since this is a controlled element
      store.set(store.prev);
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
        stores.get(radio)!.set(true);
        return;
      }
    }

    const store = stores.get(element)!;
    if (typeof store?.prev === 'boolean') {
      // A single uncontrolled radio button with checked="false".
      store.set(store.prev);
    }
  });
};

/**
 * Converts React prop values to native DOM values:
 * - value: null | undefined → '' (empty string, not "null")
 * - checked: any value → boolean conversion
 */
export const toNativeValue = (
  attrName: 'checked' | 'value',
  newValue: unknown,
): boolean | string | string[] =>
  attrName === 'checked'
    ? !!newValue
    : newValue == null
      ? '' // not "null"
      : Array.isArray(newValue)
        ? newValue.map((v) => String(v))
        : String(newValue);

type Store = {
  /** The value from the user's React code */
  prev: TagAttrValue;
  /** Original DOM setter method before our override */
  set: (v: unknown, restoreCursor?: boolean) => void;
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
    'afterNextRender',
  );
};

/**
 * <select multiple/> is a very special case.
 * - When it has only one item selected its behavior is similar to single-mode
 *   selects. `value` reflects the only selected option's value.
 * - When there is a multiple selection `value` reflects only the name of the
 *   1st selected option, completely ignoring the rest of them.
 *
 * So, how do we handle it without `value`? We just need to update `selected`
 * for each of the <option/>s.
 */
const setMultuSelectValue = (
  element: HTMLSelectElement,
  value: unknown[],
): void => {
  // Unfortunately, we can't do it right away, because:
  // 1. on the 1st render we have no inner options here yet
  // 2. on subsequent render the inner options may not be fully updated yet.
  queueMicrotask(() => {
    const set = new Set(value.map((v) => String(v)));
    for (const option of element.options) {
      const selected = set.has(option.value);
      if (option.selected !== selected) {
        option.selected = selected;
      }
    }
  });
};

type FormControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
