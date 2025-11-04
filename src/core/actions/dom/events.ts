import type { TagAttrValue, TagFiberNode } from 'faiwer-react/types';

export const setEventHandler = (
  fiber: TagFiberNode,
  element: Element,
  name: string,
  value: TagAttrValue,
): void => {
  const { events } = fiber.data;

  if (value == null || value === false) {
    if (events[name]) {
      // Event handler was added before but now it's removed.
      events[name].handler = null;
    }
    return;
  }

  if (typeof value !== 'function') {
    throw new Error(
      `Unsupported format of event handler. It has to be "undefined" or a function`,
    );
  }

  const eventName = name.slice(2); // onclick -> click.

  // Instead of adding and removing event handlers on every render, we can add a
  // wrapper that calls `events[eventName]` and update only the internal
  // function when it changes.
  if (!events[name]) {
    events[name] = {
      handler: value,
      wrapper: (event: Event) => {
        // Original React doesn't support stopping propagation on `false` return.
        events[name]!.handler?.(event);
      },
    };
    element.addEventListener(eventName, events[name].wrapper);
  } else {
    // The tag is already listening to this event. Just update the internal ref.
    events[name].handler = value;
  }
};
