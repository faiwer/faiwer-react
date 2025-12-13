import type { App } from 'faiwer-react/types';
import { applyAction } from '../actions/applyAction';
import type { Action } from 'faiwer-react/types/actions';

/**
 * Moves the app into the "commit" state and applies the given actions one by
 * one.
 */
export const applyActions = (app: App, actions: Action[]): void => {
  // Used to activate HRM
  app.devTools.global?.onCommitFiberRoot?.(
    app.id,
    app.devTools.root,
    false,
    false,
  );

  app.state = 'commit';
  for (const action of actions) {
    applyAction(action);
  }
};
