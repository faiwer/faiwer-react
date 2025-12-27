import type { App } from 'faiwer-react/types';
import { applyAction } from '../actions/applyAction';
import type { Action } from 'faiwer-react/types/actions';
import { fiberToRFiber } from '../devTools/toRFiber';

/**
 * Moves the app into the "commit" state and applies the given actions one by
 * one.
 */
export const applyActions = (app: App, actions: Action[]): void => {
  app.state = 'commit';
  for (const action of actions) {
    applyAction(action);
  }
  const { devTools } = app;
  if (devTools) {
    try {
      if (!devTools.root.current) {
        devTools.root.current = fiberToRFiber(app.root, 0);
      }
      devTools.hooks?.onCommitFiberRoot?.(
        devTools.id!,
        devTools.root,
        false,
        false,
      );
    } catch (error: unknown) {
      console.error(error);
    }
  }
};
