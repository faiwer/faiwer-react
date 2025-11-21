import type { FiberNode } from 'faiwer-react/types';
import { getParentElement } from './helpers';
import { ReactError } from '../reconciliation/errors/ReactError';

/**
 * Creates a new text DOM node.
 */
export function createTextAction(fiber: FiberNode) {
  if (fiber.type !== 'text') {
    throw new ReactError(
      fiber,
      `Can't apply CreateText for a ${fiber.type} node`,
    );
  }

  fiber.element = new Text(fiber.props.text);
  getParentElement(fiber).appendChild(fiber.element);
}
