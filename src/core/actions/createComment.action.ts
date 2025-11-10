import type { FiberNode } from 'faiwer-react/types';
import type { CreateCommentAction } from 'faiwer-react/types/actions';
import { getParentElement } from './helpers';
import { tryToCompactNode } from '../compact';
import { buildComment } from '../reconciliation/comments';

/**
 * Creates a new comment DOM node (<!--r:${mode}:${fiber.id}-->).
 */
export function createCommentAction(
  fiber: FiberNode,
  { mode }: Pick<CreateCommentAction, 'mode'>,
) {
  // Only two scenarios lead here:
  // - First render of a fragment or component. The parent's element is a
  //   comment `r:begin:{id}`
  // - Render of a portal. The parent element is the portal target node.
  fiber.element = buildComment(mode, fiber.id);
  getParentElement(fiber).appendChild(fiber.element);

  if (mode === 'end') {
    // All children are added. If the current fiber is the only child, we can
    // compact the parent node: "<!--begin-->child<!--end-->" -> "child".
    tryToCompactNode(fiber);
  }
}
