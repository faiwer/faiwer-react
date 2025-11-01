import type { FiberNode, TagAttrValue, TagFiberNode } from 'faiwer-react/types';
import type { SetAttrAction } from 'faiwer-react/types/actions';
import { nullthrows } from 'faiwer-react/utils';
import { isEventHandler } from './helpers';

/**
 * It's applicable only to DOM Tag nodes and handles the following scenarios:
 * - Removing, adding or updating an attribute
 * - Removing, adding or replacing an event handler
 */
export function setAttrAction(
  fiber: FiberNode,
  { name, value }: SetAttrAction,
) {
  if (fiber.type !== 'tag') {
    throw new Error(`Can't apply SetAttr to a ${fiber.type} node`);
  }

  if (fiber.role === 'portal') {
    throw new Error(`Can't apply SetAttr to a portal node`);
  }

  const element = nullthrows(fiber.element);

  if (isEventHandler(name, value) || name in fiber.data.events) {
    setEventHandler(fiber, element, name, value);
  } else if (value == null) {
    element.removeAttribute(name);
  } else {
    const strValue = String(value);
    if (strValue !== element.getAttribute(name)) {
      // Without this check updates like img.src = the-same-src
      // lead to retrigerring the onload handler.
      element.setAttribute(name === 'className' ? 'class' : name, strValue);
    }
  }
}

const setEventHandler = (
  fiber: TagFiberNode,
  element: Element,
  name: string,
  value: TagAttrValue,
): void => {
  const { events } = fiber.data;

  // Event handler was added before but now it's removed.
  if (value == null || value === false) {
    events[name]!.handler = null;
    return;
  }

  if (typeof value !== 'function') {
    throw new Error(
      `Unsupported format of event handler. It has to be "undefined" or a function`,
    );
  }

  const eventName = name.slice(2); // onclick -> click.

  // Instead of adding and removing event handlers on every renders we can add a
  // wrapper that calls `events[eventName]`, and update only the internal
  // function when it changes.
  if (!events[name]) {
    events[name] = {
      handler: value,
      wrapper: (event: Event) => {
        // Original React doesn't support stopping propagation on `false return.
        events[name]!.handler?.(event);
      },
    };
    element.addEventListener(eventName, events[name].wrapper);
  } else {
    // The tag is already listening this event. Just update the internal ref.
    events[name].handler = value;
  }
};
