import type { FiberNode, UnknownProps } from 'faiwer-react/types';
import type { Action } from 'faiwer-react/types/actions';
import { runComponent } from '../../components';
import { jsxElementToFiberNode } from '../../reactNodeToFiberNode';
import { collectActionsFromChildrenPair } from './fromChildrenPair';
import { toFiberChildren } from '../fibers';
import { ReactError } from '../errors/ReactError';
import { isErrorBoundary } from 'faiwer-react/hooks/useError';

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
): ReactError | Action[] => {
  const compActionsX = runComponent(fiber, props);
  // Component cannot be its own error boundary. Pass it through.
  if (compActionsX instanceof ReactError) return compActionsX;

  const [newReactChildren, compActions] = compActionsX;
  const childrenX = jsxElementToFiberNode(
    newReactChildren,
    fiber,
    false, // Don't unwrap sub-components when it's not needed
  );
  if (childrenX instanceof ReactError) {
    throw new Error(`Not yet implemented`);
  }

  const [newFiber, childrenActions] = childrenX;
  const diffActionsX = collectActionsFromChildrenPair(
    fiber,
    toFiberChildren(newFiber),
  );
  if (diffActionsX instanceof ReactError) {
    if (isErrorBoundary(fiber)) {
      throw new Error(`Not yet implemented`);
    } else return diffActionsX;
  }

  return [...compActions, ...childrenActions, ...diffActionsX];
};
