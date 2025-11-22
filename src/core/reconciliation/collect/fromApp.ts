import type { App } from 'faiwer-react/types';
import type { Action } from 'faiwer-react/types/actions';
import { collectActionsFromComponent } from './fromComponent';
import { ReactError } from '../errors/ReactError';

/**
 * Goes through the list of invalidated components, runs them, finds the diff,
 * and returns the list of actions to convert the previous fiber tree to the new
 * one.
 */
export const collectActionsFromApp = (app: App): ReactError | Action[] => {
  const actions: Action[] = [];

  while (!app.invalidatedComponents.isEmpty()) {
    const [fiber, props] = app.invalidatedComponents.poll();
    const actionsX = collectActionsFromComponent(fiber, props);
    if (actionsX instanceof ReactError) {
      return actionsX.catchActionArrOrPassThru();
    }
    actions.push(...actionsX);
  }

  return actions;
};
