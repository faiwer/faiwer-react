import type { FiberNode } from 'faiwer-react/types';
import type { SetAttrAction } from 'faiwer-react/types/actions';
import { nullthrows } from 'faiwer-react/utils';
import { isEventName } from './helpers';
import { setSvgAttribute } from './dom/svg';
import { setTagStyles } from './dom/css';
import { setEventHandler } from './dom/events';
import { setHtmlAttribute } from './dom/attributes';
import { changeControlValue, setValueAttr } from './dom/value';
import { getAppByFiber } from '../reconciliation/app';

/**
 * Applicable only to DOM tag nodes and handles the following scenarios:
 * - Removing, adding or updating an attribute
 * - Removing, adding or replacing an event handler
 */
export function setAttrAction(
  fiber: FiberNode,
  { name, value, creation }: Pick<SetAttrAction, 'name' | 'value' | 'creation'>,
) {
  if (fiber.type !== 'tag') {
    throw new Error(`Can't apply SetAttr to a ${fiber.type} node`);
  }

  if (fiber.role === 'portal') {
    throw new Error(`Can't apply SetAttr to a portal node`);
  }

  const element = nullthrows(fiber.element);

  if (isControllableAttrValue(fiber.element, name)) {
    setValueAttr(fiber, name, value);
  } else if (name === 'defaultChecked' && element instanceof HTMLInputElement) {
    if (creation) {
      changeControlValue(getAppByFiber(fiber), element, 'checked', value);
    }
  } else if (
    name === 'defaultValue' &&
    (element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement)
  ) {
    if (creation) {
      changeControlValue(getAppByFiber(fiber), element, 'value', value);
    }
  } else if (isEventName(name) || name in fiber.data.events) {
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

/**
 * Returns true if the given attribute is the controllable (by React) value of
 * the given HTML control. E.g.:
 * - for input[type=text] the value attributes is "value"
 * - but for input[type="radio"] it's "checked", whereas "value" is just a
 *   optional string attribute.
 */
const isControllableAttrValue = (
  element: Element | null,
  name: string,
): name is 'checked' | 'value' => {
  if (element instanceof HTMLInputElement) {
    const { type } = element;
    return type === 'radio' || type === 'checkbox'
      ? name === 'checked'
      : name === 'value';
  }

  if (
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    return name === 'value';
  }

  return false;
};
