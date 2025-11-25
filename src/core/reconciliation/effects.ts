import type { App, EffectMode, FiberNode } from 'faiwer-react/types';
import { getAppByFiber } from './app';

/**
 * Adds to a planner the given effect.
 * - `refs` & `layout` effects are run in the same microtask queue
 * - `normal` effects are normally run in the next microtask, but sometimes can
 *   be run in the same microtask queue (when one of the ref or layout effects
 *   invalidates a component).
 */
export const scheduleEffect = (
  fiber: FiberNode,
  fn: () => void,
  mode: EffectMode,
): void => {
  getAppByFiber(fiber).effects[mode].push({ fiber, fn, cancelled: false });
};

/**
 * Run scheduled effects one-by-one from the given queue.
 */
export const runEffects = (app: App, mode: EffectMode) => {
  const effects = app.effects[mode];
  app.effects[mode] = [];

  for (const { fn, fiber, cancelled } of effects) {
    if (!cancelled) {
      fn(fiber);
    }
  }
};
