import type { FiberNode } from 'faiwer-react/types';
import { getAppByFiber } from './app';
import { reactRender } from './render';

/**
 * Put the given component to the update-queue (`invalidatedComponents`).
 * Schedules a new render cycle if it's not scheduled already. Throws an error
 * if invalidating is happening in the wrong app state.
 */
export const invalidateFiber = (fiber: FiberNode): void => {
  if (fiber.type !== 'component') {
    throw new Error(`Cannot invalidate a non-component fiber (${fiber.type})`);
  }

  const app = getAppByFiber(fiber);

  switch (app.state) {
    case 'idle':
      app.invalidatedComponents.add(fiber);
      queueMicrotask(() => reactRender(app));
      break;

    case 'scheduled':
    case 'effects':
    case 'layoutEffects':
      app.invalidatedComponents.add(fiber);
      break;

    case 'render':
      throw new Error(`Don't update state during the render phase`);
  }
};
