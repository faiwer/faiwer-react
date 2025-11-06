import type { FiberNode } from 'faiwer-react/types';
import { getAppByFiber } from './app';
import { reactRender } from './render';
import { isFiberDead } from './fibers';

/**
 * Adds the given component to the update queue (`invalidatedComponents`).
 * Schedules a new render cycle if one isn't scheduled already. Throws an error
 * if invalidation is happening in the wrong app state.
 */
export const invalidateFiber = (fiber: FiberNode): void => {
  if (fiber.type !== 'component') {
    throw new Error(`Cannot invalidate a non-component fiber (${fiber.type})`);
  }
  if (isFiberDead(fiber)) {
    throw new Error(`Cannot invalidate a dead component`);
  }

  const app = getAppByFiber(fiber);

  switch (app.state) {
    case 'idle':
      app.invalidatedComponents.add(fiber);
      app.state = 'scheduled';
      queueMicrotask(() => reactRender(app));
      break;

    case 'scheduled':
    case 'effects':
    case 'layoutEffects':
    case 'refEffects':
      app.invalidatedComponents.add(fiber);
      break;

    case 'render':
      throw new Error(`Don't update state during the render phase`);
  }
};
