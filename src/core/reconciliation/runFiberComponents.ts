import type { App, FiberNode, NullFiberNode } from 'faiwer-react/types';
import { runComponent } from '../components';
import { jsxElementToFiberNode } from '../reactNodeToFiberNode';
import { createFiberNode, FAKE_CONTAINER_TAG, toFiberChildren } from './fibers';
import { ReactError } from './errors/ReactError';
import type { Action } from 'faiwer-react/types/actions';

/**
 * By default we don't run all components. We run only those that were manually
 * invalidated, as if they were all wrapped with `memo()`. So the `.children`
 * node of such fibers is empty. This method recursively goes through all of the
 * given fiber DOM subtree nodes and runs all found components to fill their
 * `.children`. Should be used only for not-yet-mounted component fiber nodes.
 */
export const runFiberComponents = (
  app: App,
  fiber: FiberNode,
): ReactError | Action[] => {
  if (app.testMode) checkParents(fiber);
  const actions: Action[] = [];

  switch (fiber.type) {
    case 'fragment':
    case 'tag':
      for (const child of fiber.children) {
        const childActionsX = runFiberComponents(app, child);
        // Tags & fragemtns can't be error boundaries. Pass it through.
        if (childActionsX instanceof ReactError) return childActionsX;
        actions.push(...childActionsX);
      }
      break;

    case 'component': {
      const compX = runComponent(fiber, null);
      // `fiber` can't be an error boundary for itself.
      if (compX instanceof ReactError) return compX;

      const [newChildren, compActions] = compX;
      let childrenX = jsxElementToFiberNode(
        newChildren,
        fiber,
        true /* run children-components recursively */,
      );
      if (childrenX instanceof ReactError) {
        // `fiber` is not mounted yet, and it must have at least one child node.
        const nullFiber: NullFiberNode = {
          ...createFiberNode(fiber),
          type: 'null',
          parent: fiber,
          props: null,
        };
        childrenX = [nullFiber, [childrenX.genCatchAction()!]];
      }

      const [child, childrenActions] = childrenX;
      fiber.children = toFiberChildren(child);
      actions.push(...compActions, ...childrenActions);
      break;
    }
  }

  return actions;
};

const checkParents = (fiber: FiberNode): void => {
  let parent = fiber.parent;
  while (parent && parent.tag !== FAKE_CONTAINER_TAG) parent = parent.parent;
  if (!parent) {
    throw new ReactError(
      fiber,
      `runFiberComponents shouldn't be called for already mounted fiber nodes`,
    );
  }
};
