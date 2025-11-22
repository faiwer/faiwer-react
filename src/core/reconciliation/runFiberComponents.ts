import type { App, FiberNode } from 'faiwer-react/types';
import { runComponent } from '../components';
import { jsxElementToFiberNode } from '../reactNodeToFiberNode';
import { FAKE_CONTAINER_TAG, toFiberChildren } from './fibers';
import { ReactError } from './errors/ReactError';
import type { Action } from 'faiwer-react/types/actions';

/**
 * By default we don't run all components. We run only those that were manually
 * invalidated, as if they were all wrapped with `memo()`. So the `.children`
 * node of such fibers is empty. This method recursively goes through all of the
 * given fiber DOM subtree nodes and runs all found components to fill their
 * `.children`. Should be used only for not-yet-mounted component fiber nodes.
 */
export const runFiberComponents = (app: App, fiber: FiberNode): Action[] => {
  if (app.testMode) checkParents(fiber);
  const actions: Action[] = [];

  switch (fiber.type) {
    case 'fragment':
    case 'tag':
      for (const child of fiber.children) {
        actions.push(...runFiberComponents(app, child));
      }
      break;

    case 'component': {
      const [newChildren, compActions] = runComponent(fiber, null);
      const [child, childrenActions] = jsxElementToFiberNode(
        newChildren,
        fiber,
        true /* run children-components recursively */,
      );
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
