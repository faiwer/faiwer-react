import type { FiberNode } from 'faiwer-react/types';
import { getParentElement } from './helpers';
import { applyAction } from './applyAction';

/**
 * It handles two scenarios:
 * - Creates a <!--r:portal:id--> comment for a portal fiber
 * - Creates a new tag DOM-node for a tag fiber
 *
 * It doesn't create children nodes and doesn't set any attributes or event
 * handlers.
 */
export function createTagAction(fiber: FiberNode): void {
  if (fiber.type !== 'tag') {
    throw new Error(`createTagAction supports only tag-fiber-nodes.`);
  }

  if (fiber.data instanceof HTMLElement) {
    // It's a portal. Not a regular tag. We shouldn't create it, it already
    // exists somewhere outside of the app's dom-sub-tree. Instead we need
    // to create a new <!--r:portal:id--> node.
    applyAction({ type: 'CreateComment', fiber, mode: 'portal' });
  } else if (fiber.tag !== 'root') {
    // 'root' is also a special case. It's the node where the app is mounted.
    const tag = document.createElement(fiber.tag);
    fiber.element = tag;
    getParentElement(fiber).appendChild(fiber.element);
  }
}
