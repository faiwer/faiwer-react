import type {
  FiberNode,
  TagAttrValue,
  TagFiberNode,
  TagStyles,
} from 'faiwer-react/types';
import type { SetAttrAction } from 'faiwer-react/types/actions';
import { nullthrows } from 'faiwer-react/utils';
import { isEventName } from './helpers';

/**
 * Applicable only to DOM tag nodes and handles the following scenarios:
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

  if (isEventName(name) || name in fiber.data.events) {
    setEventHandler(fiber, element, name, value);
  } else if (name === 'style') {
    setTagStyles(fiber, value);
  } else if (value == null) {
    element.removeAttribute(name);
  } else {
    const strValue = String(value);
    if (strValue !== element.getAttribute(name)) {
      // Without this check, updates like img.src = the-same-src
      // lead to retriggering the onload handler.
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

/**
 * Handles removing, toggling and adding tag styles.
 */
const setTagStyles = (
  fiber: TagFiberNode,
  /** Should be a CSS-string (hyphens) or a CSS map (camelCase) */
  stylesRaw: TagAttrValue,
): void => {
  if (
    typeof stylesRaw !== 'string' &&
    (stylesRaw === null || typeof stylesRaw !== 'object')
  ) {
    throw new Error(`Unsupported format of styles`);
  }

  const elementStyle = (fiber.element as HTMLElement).style;
  const newStyles: TagStyles =
    typeof stylesRaw === 'string' ? strToStyles(stylesRaw) : stylesRaw;

  for (const key of Object.keys(fiber.data.styles ?? {})) {
    if (!(key in newStyles)) {
      elementStyle.removeProperty(key);
    }
  }

  for (const [key, value] of Object.entries(newStyles)) {
    if (key.includes('-')) {
      elementStyle.setProperty(key, value as string);
    } else {
      if (key in elementStyle) {
        // @ts-ignore It's wrongly typed as read-only.
        elementStyle[key as keyof TagStyles] = value;
      }
    }
  }

  fiber.data.styles = newStyles;
};

/**
 * Converts a string like "color: red; font-size: 12px" to
 * { color: 'red', ['font-size']: '12px' }
 */
const strToStyles = (css: string): TagStyles => {
  cssDummy.style.cssText = css;
  return Object.fromEntries(
    Array.from(cssDummy.style).map((k) => [
      k,
      cssDummy.style[k as keyof TagStyles] as string,
    ]),
  );
};

const cssDummy = document.createElement('x-css-dummy');
