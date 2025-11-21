import { containerSym, type FiberNode } from 'faiwer-react/types';
import { getParentElement } from './helpers';
import { buildComment } from '../reconciliation/comments';

/**
 * Once all component- or fragment-fiber's nodes are mounted we can finalize
 * their fragment-like container.
 */
export function createContainerAction(fiber: FiberNode) {
  if (fiber.children.length === 0) {
    // Case 1: We have no child nodes, so create an !--empty comment.
    const container = getParentElement(fiber);
    const empty = buildComment('empty', fiber.id);
    container.appendChild(empty);
    fiber.element = empty;
  } else if (fiber.children.length === 1) {
    // Case 2: We have only one child. Let's refer to it. It's slightly faster
    // than the `containerSym` approach.
    fiber.element = fiber.children[0].element;
  } else {
    // Case 3: We have more then one DOM children. Resort to the slow path:
    // containerSym. In such a mode to get the fiber's domNodes we need to
    // traverse through some of its children.
    fiber.element = containerSym;
  }
}
