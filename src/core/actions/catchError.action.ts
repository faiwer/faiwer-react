import { type ComponentFiberNode, type FiberNode } from 'faiwer-react/types';
import { removeAction } from './remove.action';
import { scheduleEffect } from '../reconciliation/effects';
import { getAppByFiber } from '../reconciliation/app';
import type { CatchErrorAction } from 'faiwer-react/types/actions';

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
    let last = fiber.children.at(-1);
    for (const child of fiber.children) {
      removeAction(child, { last: child === last });
    }

    fiber.children = [];
  }
  // else: fiber.children === [nullNode].
}
