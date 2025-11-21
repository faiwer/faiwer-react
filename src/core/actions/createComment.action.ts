import { type FiberNode } from 'faiwer-react/types';
import type { CreateCommentAction } from 'faiwer-react/types/actions';
import { getParentElement } from './helpers';
import { buildComment } from '../reconciliation/comments';

/**
 * Creates a new comment DOM node (<!--r:${mode}:${fiber.id}-->).
 */
export function createCommentAction(
  fiber: FiberNode,
  { mode }: Pick<CreateCommentAction, 'mode'>,
) {
  // Only two scenarios lead here:
  // - Render a component or a fragment without children
  // - Render of a portal. The parent element is the portal target node.
  fiber.element = buildComment(mode, fiber.id);
  getParentElement(fiber).appendChild(fiber.element);
}
