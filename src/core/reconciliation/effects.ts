import type { App, EffectMode } from 'faiwer-react/types';

/**
 * Adds to a planner the given effect.
 * - `refs` & `layout` effects are run in the same microtask queue
 * - `normal` effects are normally run in the next microtask, but sometimes can
 *   be run in the same microtask queue (when one of the ref or layout effects
 *   invalidates a component).
 */
export const scheduleEffect = (
  app: App,
  effect: () => void,
  mode: EffectMode,
): void => {
  app.effects[mode].push(effect);
};

/**
 * Run scheduled effects one-by-one from the given queue.
 */
export const runEffects = (app: App, mode: EffectMode) => {
  if (mode === 'layout') {
    // "refs" effects are essentially layout effects that should be started
    // before user-defined layout effects.
    runEffects(app, 'refs');
  }

  const effects = app.effects[mode];
  app.effects[mode] = [];

  for (const fn of effects) {
    fn();
  }
};
