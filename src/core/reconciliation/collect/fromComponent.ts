import type { App, FiberNode } from 'faiwer-react/types';
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
  app: App,
  fiber: FiberNode,
  /** When given this node's props are used to run the component. */
  updated: FiberNode | null,
): Action[] => {
  if (!app.invalidatedComponents.has(fiber)) {
    throw new Error(`Component is not scheduled to update`);
  }

  app.invalidatedComponents.delete(fiber);
  const newReactChildren: JSX.Element = runComponent(fiber, updated);
  const newFiber: FiberNode = jsxElementToFiberNode(
    newReactChildren,
    fiber,
    false, // Don't unwrap sub-components when it's not needed
  );
  return collectActionsFromChildrenPair(fiber, toFiberChildren(newFiber));
};
