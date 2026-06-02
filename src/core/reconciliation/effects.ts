import type { App, EffectMode, FiberNode } from 'faiwer-react/types';
import { getAppByFiber } from './app';
import { ReactError } from './errors/ReactError';
import { findClosestErrorBoundary } from 'faiwer-react/hooks/useError';
import { traverseFiberTree } from '../actions/helpers';
import { catchErrorAction } from '../actions/catchError.action';
import { getFiberLevel } from './fibers';

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

  const comparator = getEffectsComparator(mode);
  const effectsToRun = comparator ? [...effects].sort(comparator) : effects;

  for (const { fn, fiber, cancelled } of effectsToRun) {
    if (cancelled) {
      // Another component within the same error boundary children group failed
      // during running one of its effects.
      continue;
    }

    try {
      fn(fiber);
    } catch (errorRaw: unknown) {
      if (isRefEffectMode(mode)) {
        fiber.ref = null; // Don't run the ref-destructor for this fiber.
      }

      reportEffectError(app, fiber, errorRaw, { activeEffects: effectsToRun });
    }
  }

};

export const reportEffectError = (
  app: App,
  fiber: FiberNode,
  errorRaw: unknown,
  {
    activeEffects = [],
    skipUnmount = false,
  }: {
    activeEffects?: QueuedEffect[];
    skipUnmount?: boolean;
  } = {},
): void => {
  const error = new ReactError(
    fiber,
    `Error during running effect. ${String(errorRaw)}`,
  );
  error.cause = errorRaw;

  const boundary = findClosestErrorBoundary(fiber);
  if (!boundary) {
    throw error;
  }

  cancelSetEffects(app, collectBoundaryChildren(boundary), activeEffects);
  catchErrorAction(boundary, { error, skipUnmount });
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
const cancelSetEffects = (
  app: App,
  fibers: Set<number>,
  activeEffects: QueuedEffect[],
) => {
  for (const group of [
    activeEffects,
    app.effects.layoutUnmount,
    app.effects.layoutMount,
    app.effects.normalUnmount,
    app.effects.normalMount,
    app.effects.domRefsMount,
    app.effects.imperativeHandlesUnmount,
    app.effects.imperativeHandlesMount,
  ]) {
    for (const effect of group) {
      if (fibers.has(effect.fiber.id)) {
        effect.cancelled = true;
      }
    }
  }
};

const isRefEffectMode = (mode: EffectMode): boolean =>
  mode === 'refsUnmount' ||
  mode === 'domRefsMount' ||
  mode === 'imperativeHandlesUnmount' ||
  mode === 'imperativeHandlesMount';

type QueuedEffect = App['effects'][EffectMode][number];

const parentFirst = (a: QueuedEffect, b: QueuedEffect): number =>
  getFiberLevel(a.fiber) - getFiberLevel(b.fiber);

const childFirst = (a: QueuedEffect, b: QueuedEffect): number =>
  getFiberLevel(b.fiber) - getFiberLevel(a.fiber);

const getEffectsComparator = (
  mode: EffectMode,
): ((a: QueuedEffect, b: QueuedEffect) => number) | null => {
  switch (mode) {
    case 'refsUnmount':
      return parentFirst;

    case 'imperativeHandlesUnmount':
    case 'layoutUnmount':
    case 'normalUnmount':
    case 'domRefsMount':
    case 'imperativeHandlesMount':
    case 'layoutMount':
    case 'normalMount':
      return childFirst;

    case 'afterActions':
      return null;
  }
};
