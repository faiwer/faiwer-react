import type { App } from 'faiwer-react/types';
import type { Action } from 'faiwer-react/types/actions';
import { collectActionsFromComponent } from './fromComponent';
import { ReactError } from '../errors/ReactError';
import { collectActionsFromChildrenPair } from './fromChildrenPair';
import { cloneFiber, isRootFiber } from '../fibers';

/**
 * Goes through the list of invalidated components, runs them, finds the diff,
 * and returns the list of actions to convert the previous fiber tree to the new
 * one.
 */
export const collectActionsFromApp = (app: App): ReactError | Action[] => {
  const actions: Action[] = [];

  while (!app.invalidatedComponents.isEmpty()) {
    const [fiber, props] = app.invalidatedComponents.poll();
    const actionsX = isRootFiber(fiber)
      ? // HMR may require a root rerender, when one of the root's direct children
        // components got hooks changes.
        collectActionsFromChildrenPair(
          app.root,
          app.root.children.map((n) => cloneFiber(n)),
        )
      : collectActionsFromComponent(fiber, props);
    if (actionsX instanceof ReactError) {
      return actionsX.catchActionArrOrPassThru();
    }
    actions.push(...actionsX);

    if (isRootFiber(fiber)) {
      app.preact?.invalidated.add(fiber.id);
    }
  }

  return actions;
};
