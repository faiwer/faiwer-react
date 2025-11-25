import type { App, EffectMode, FiberNode } from 'faiwer-react/types';
import { getAppByFiber } from './app';
import { ReactError } from './errors/ReactError';
import { findClosestErrorBoundary } from 'faiwer-react/hooks/useError';
import { traverseFiberTree } from '../actions/helpers';
import { catchErrorAction } from '../actions/catchError.action';

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

  for (const { fn, fiber, cancelled } of effects) {
    if (cancelled) {
      // Another component within the same error boundary children group failed
      // during running one of its effects.
      continue;
    }

    try {
      fn(fiber);
    } catch (errorRaw: unknown) {
      const error = new ReactError(
        fiber,
        `Error during running effect. ${String(errorRaw)}`,
      );
      const boundary = findClosestErrorBoundary(fiber);
      if (!boundary) {
        throw error;
      }

      cancelSetEffects(app, collectBoundaryChildren(boundary));
      catchErrorAction(boundary, { error });
    }
  }

  app.effects[mode] = [];
};

/** Return IDs of all given error boundary fiber children. */
const collectBoundaryChildren = (boundary: FiberNode): Set<number> => {
  const fibers = new Set<number>();
  traverseFiberTree(boundary, (fiber) => {
    if (fiber !== boundary) {
      fibers.add(fiber.id);
    }
  });

  return fibers;
};

/** Cancels all effects that aren't destructors for given set of fibers. */
const cancelSetEffects = (app: App, fibers: Set<number>) => {
  for (const group of [
    app.effects.layout,
    app.effects.normal,
    app.effects.refsMount,
  ]) {
    for (const effect of group) {
      if (fibers.has(effect.fiber.id)) {
        effect.cancelled = true;
      }
    }
  }
};
