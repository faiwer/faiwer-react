import type { FiberNode } from 'faiwer-react/types';
import type { SetAttrAction } from 'faiwer-react/types/actions';
import { nullthrows } from 'faiwer-react/utils';
import { isEventName } from './helpers';
import { setSvgAttribute } from './dom/svg';
import { setTagStyles } from './dom/css';
import { setEventHandler } from './dom/events';
import { setHtmlAttribute } from './dom/attributes';

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
    // Without this check, updates like img.src = the-same-src lead to
    // retriggering the onload handler.
    if (strValue !== element.getAttribute(name)) {
      if (element instanceof SVGElement) {
        setSvgAttribute(element, name, strValue);
      } else {
        setHtmlAttribute(element as HTMLElement, name, value);
      }
    }
  }
}
