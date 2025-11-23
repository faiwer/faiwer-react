import { type ComponentFiberNode, type FiberNode } from 'faiwer-react/types';
import { removeAction } from './remove.action';
import { scheduleEffect } from '../reconciliation/effects';
import { getAppByFiber } from '../reconciliation/app';
import type { CatchErrorAction } from 'faiwer-react/types/actions';
import { tryFixContainerType } from './relayout.action';

/**
 * During the current render one of the components failed. This is the error
 * handler for the closest error boundary component.
 * - It removes the existing content
 * - Runs the error handler
 */
export function catchErrorAction(
  fiber: FiberNode,
  { error }: Pick<CatchErrorAction, 'error'>,
) {
  scheduleEffect(
    getAppByFiber(fiber),
    () => {
      const handlers = (fiber as ComponentFiberNode).data.hooks!.filter(
        (h) => h.type === 'error',
      );
      for (const { fn } of handlers) {
        fn(error);
      }
    },
    'normal',
  );

  if (fiber.element) {
    // Not the 1st render. Nodes are mounted. Must be removed.
    for (const [idx, child] of fiber.children.entries()) {
      removeAction(child, { last: idx === fiber.children.length - 1 });
    }

    fiber.children = [];
    if (fiber.parent.type === 'component') {
      tryFixContainerType(fiber.parent);
    }
  }
  // else: fiber.children === [nullNode].
}
