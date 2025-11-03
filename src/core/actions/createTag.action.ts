import type { FiberNode } from 'faiwer-react/types';
import { getParentElement } from './helpers';
import { applyAction } from './applyAction';

/**
 * Handles two scenarios:
 * - Creates a <!--r:portal:id--> comment for portal fibers
 * - Creates a new tag DOM element for tag fibers
 *
 * This doesn't create child nodes or set attributes/event handlers.
 */
export function createTagAction(fiber: FiberNode): void {
  if (fiber.type !== 'tag') {
    throw new Error(`createTagAction supports only tag-fiber-nodes.`);
  }

  if (fiber.data instanceof HTMLElement) {
    // This is a portal, not a regular tag. We shouldn't create it since it
    // already exists outside the app's DOM subtree. Instead, create a
    // <!--r:portal:id--> comment node.
    applyAction({ type: 'CreateComment', fiber, mode: 'portal' });
  } else if (fiber.tag !== 'root') {
    // 'root' is a special case - it's the node where the app is mounted.
    const tag = document.createElement(fiber.tag);
    fiber.element = tag;
    getParentElement(fiber).appendChild(fiber.element);
  }
}
