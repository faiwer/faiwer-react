import type { FiberNode, UnknownProps } from 'faiwer-react/types';
import type { Action } from 'faiwer-react/types/actions';
import { runComponent } from '../../components';
import { jsxElementToFiberNode } from '../../reactNodeToFiberNode';
import { collectActionsFromChildrenPair } from './fromChildrenPair';
import { toFiberChildren } from '../fibers';

/**
 * 1. Runs a component
 * 2. Collects and returns a list of actions needed to actualize it
 *
 * Throws when the given component is not invalidated.
 */
export const collectActionsFromComponent = (
  fiber: FiberNode,
  /** Custom props (when `fiber.props` are stale). */
  props: UnknownProps | null,
): Action[] => {
  const newReactChildren: JSX.Element = runComponent(fiber, props);
  const newFiber: FiberNode = jsxElementToFiberNode(
    newReactChildren,
    fiber,
    false, // Don't unwrap sub-components when it's not needed
  );
  return collectActionsFromChildrenPair(fiber, toFiberChildren(newFiber));
};
