import type { FiberNode } from 'faiwer-react/types';
import type { SetTextAction } from 'faiwer-react/types/actions';
import {
  nullthrowsForFiber,
  ReactError,
} from '../reconciliation/errors/ReactError';

/**
 * Replaces the text content within a Text DOM node.
 */
export function setTextAction(fiber: FiberNode, { text }: SetTextAction) {
  if (fiber.type !== 'text') {
    throw new ReactError(fiber, `Can't apply setText action to non-text node`);
  }
  fiber.props = { text };
  nullthrowsForFiber(fiber, fiber.element).textContent = text;
}
