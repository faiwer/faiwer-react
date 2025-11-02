import type { FiberNode } from 'faiwer-react/types';
import { getParentElement } from './helpers';

/**
 * Creates a new text DOM node.
 */
export function createTextAction(fiber: FiberNode) {
  if (fiber.type !== 'text') {
    throw new Error(`Can't apply CreateText for a ${fiber.type} node`);
  }

  // Only two scenarios lead here:
  // - 1st render of a fragment or a component. The parent's element is
  //   a comment `r:begin:{id}`
  // - Render of a portal. The parent element is the portal target node.
  fiber.element = new Text(fiber.props.text);
  getParentElement(fiber).appendChild(fiber.element);
}
