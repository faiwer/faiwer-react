import type { App } from 'faiwer-react/types';
import { reactRender } from './render';
import { runEffects } from './effects';

/**
 * A stage that happens when we applied all necessary DOM- and fiber-changes in
 * applyActions (aka as the "commit"). In this stage we:
 * - run all kinds of effects
 * - when needed schedule another render cycle (effects updated a component
 *   state)
 * - or move the app to the idle stage
 */
export function postCommit(app: App) {
  app.tempContext.clear();

  // Run "ref" and "layout" effects. They have to be run in the same micro-queue
  // with the commit phase.
  if (app.effects.layout.length > 0 || app.effects.refs.length > 0) {
    app.state = 'layoutEffects';
    runEffects(app, 'layout'); // It will also run "ref" effects

    if (app.invalidatedComponents.size > 0) {
      // 1+ component was invalidated in an effect
      if (app.effects.normal.length > 0) {
        // Layout effect component invalidations should be applied within the
        // same microtask queue, so we need to run the scheduled normal effecs
        // right away.
        app.state = 'effects';
        runEffects(app, 'normal');
      }

      app.state = 'scheduled';
      queueMicrotask(() => reactRender(app));
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

    if (app.invalidatedComponents.size > 0) {
      app.state = 'scheduled';
      setTimeout(() => reactRender(app), 0);
      return;
    }

    app.state = 'idle';
  }, 0);
}
