import type { App } from 'faiwer-react/types';
import type { Action } from 'faiwer-react/types/actions';
import { collectActionsFromComponent } from './fromComponent';
import { getFiberLevel } from '../fibers';

/**
 * Goes through the list of invalidated components, runs them, finds the diff,
 * and returns the list of actions to convert the previous fiber tree to the new
 * one.
 */
export const collectActionsFromApp = (app: App): Action[] => {
  const actions: Action[] = [];

  // Sort invalidated components by their level in the fiber tree to run the
  // parent components before their children components.
  const sorted = [...app.invalidatedComponents]
    .map((f) => ({ fiber: f, level: getFiberLevel(f) }))
    .sort((a, b) => a.level - b.level);
  for (const { fiber } of sorted) {
    // Redo the check because some components can be indirectly removed in between.
    if (app.invalidatedComponents.has(fiber)) {
      actions.push(...collectActionsFromComponent(app, fiber, null));
    }
  }

  if (app.invalidatedComponents.size > 0) {
    // The only reason why a component might be kept in `invalidatedComponents`
    // after the first run is that this component was "trapped" inside a
    // non-invalidated component. We don't traverse through the whole fiber
    // tree, so we need to run the rest of the queue again.
    if (app.testMode) {
      // A sanity check
      for (const fiber of app.invalidatedComponents) {
        if (
          fiber.type !== 'component' ||
          !fiber.data.hooks?.some((h) => h.type === 'context')
        ) {
          throw new Error(`Fiber node is stuck`);
        }
      }
    }

    actions.push(...collectActionsFromApp(app));
  }

  return actions;
};
