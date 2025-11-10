import type { App } from 'faiwer-react/types';
import { reactRender } from './render';
import { runEffects } from './effects';

/**
 * A stage that happens after we've applied all necessary DOM and fiber changes
 * in applyActions (the "commit" phase). In this stage we:
 * - run all kinds of effects
 * - when needed, schedule another render cycle (if effects updated component
 *   state)
 * - or move the app to the idle stage
 */
export function postCommit(app: App, depth: number) {
  app.tempContext.clear();

  // Run "ref" and "layout" effects. They must be run in the same microtask
  // queue as the commit phase.
  if (app.effects.layout.length > 0 || app.effects.refs.length > 0) {
    app.state = 'refEffects';
    runEffects(app, 'refs');

    app.state = 'layoutEffects';
    runEffects(app, 'layout');

    if (!app.invalidatedComponents.isEmpty()) {
      // 1+ component was invalidated in an effect
      if (app.effects.normal.length > 0) {
        // Layout effect component invalidations should be applied within the
        // same microtask queue, so we need to run the scheduled normal effects
        // right away.
        app.state = 'effects';
        runEffects(app, 'normal');
      }

      app.state = 'scheduled';
      queueMicrotask(() => reactRender(app, depth + 1));
      return;
    }
  }

  if (app.effects.normal.length === 0) {
    app.state = 'idle';
    return;
  }

  app.state = 'effects';
  setTimeout(() => {
    runEffects(app, 'normal');

    if (!app.invalidatedComponents.isEmpty()) {
      app.state = 'scheduled';
      setTimeout(() => reactRender(app), 0);
      return;
    }

    app.state = 'idle';
  }, 0);
}
