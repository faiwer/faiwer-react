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

  // Instead of adding and removing event handlers on every render, we can add a
  // wrapper that calls `events[name]` and update only the internal
  // function when it changes.
  if (!events[name]) {
    const capture = name.endsWith('Capture');
    let eventName = name.slice(2).toLowerCase(); // onClick -> click.
    if (capture) {
      eventName = eventName.slice(0, eventName.length - 7);
    }

    if (
      eventName === 'change' &&
      (fiber.tag === 'input' || fiber.tag === 'textarea')
    ) {
      eventName = 'input'; // Custom behavior. @see `./value.ts`.
    }

    events[name] = {
      name: eventName,
      handler: value,
      capture,
      wrapper: (event: Event) => {
        // Original React doesn't support stopping propagation on `false` return.
        events[name]!.handler?.(event);
      },
    };
    element.addEventListener(eventName, events[name].wrapper, { capture });
  } else {
    // The tag is already listening to this event. Just update the internal ref.
    events[name].handler = value;
  }
};
