import type { App } from 'faiwer-react/types';
import { applyAction } from '../actions/applyAction';
import type { Action } from 'faiwer-react/types/actions';

/**
 * Moves the app into the "commit" state and applies the given actions one by
 * one.
 */
export const applyActions = (app: App, actions: Action[]): void => {
  app.state = 'commit';
  for (const action of actions) {
    applyAction(action);
  }

  app.devTools?.onCommit(app);
};
