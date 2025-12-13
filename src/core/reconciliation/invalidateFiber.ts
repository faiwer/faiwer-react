import type { FiberNode } from 'faiwer-react/types';
import { getAppByFiber } from './app';
import { reactRender } from './render';
import { isFiberDead } from './fibers';
import { ReactError } from './errors/ReactError';

/**
 * Adds the given component to the update queue (`invalidatedComponents`).
 * Schedules a new render cycle if one isn't scheduled already. Throws an error
 * if invalidation is happening in the wrong app state.
 */
export const invalidateFiber = (fiber: FiberNode): void => {
  if (fiber.type !== 'component' && fiber.tag !== 'root') {
    throw new ReactError(
      fiber,
      `Cannot invalidate a non-component and non-root fiber (${fiber.type})`,
    );
  }
  if (isFiberDead(fiber)) {
    throw new ReactError(fiber, `Cannot invalidate a dead component`);
  }

  const app = getAppByFiber(fiber);

  switch (app.state) {
    case 'idle':
      app.invalidatedComponents.add(fiber, null);
      app.state = 'scheduled';
      queueMicrotask(() => reactRender(app));
      break;

    case 'scheduled':
    case 'effects':
    case 'layoutEffects':
    case 'refEffects':
      app.invalidatedComponents.add(fiber, null);
      break;

    case 'render':
      throw new ReactError(fiber, `Don't update state during the render phase`);
  }
};
