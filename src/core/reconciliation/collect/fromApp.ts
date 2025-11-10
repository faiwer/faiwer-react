import type { App } from 'faiwer-react/types';
import type { Action } from 'faiwer-react/types/actions';
import { collectActionsFromComponent } from './fromComponent';
import { validateApp } from '../validateApp';

/**
 * Goes through the list of invalidated components, runs them, finds the diff,
 * and returns the list of actions to convert the previous fiber tree to the new
 * one.
 */
export const collectActionsFromApp = (app: App): Action[] => {
  const actions: Action[] = [];

  while (!app.invalidatedComponents.isEmpty()) {
    const [fiber, props] = app.invalidatedComponents.poll();
    actions.push(...collectActionsFromComponent(fiber, props));
  }

  if (app.testMode) validateApp(app);

  return actions;
};
