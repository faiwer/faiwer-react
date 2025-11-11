import type { FiberNode } from 'faiwer-react/types';
import { nullthrows } from 'faiwer-react/utils';
import type { SetRefAction } from 'faiwer-react/types/actions';
import { unsetRef } from './helpers';
import { scheduleEffect } from '../reconciliation/effects';
import { getAppByFiber } from '../reconciliation/app';

/**
 * A ref or ref handler for the given node was:
 * - set up
 * - or replaced
 *
 * Removing nodes with ref handlers is handled in remove and replace actions.
 */
export function setRefAction(
  fiber: FiberNode,
  { ref, dontUnsetRef }: Pick<SetRefAction, 'ref' | 'dontUnsetRef'>,
) {
  if (fiber.type !== 'tag') {
    throw new Error(`setRefAction is not compatible with ${fiber.type} nodes`);
  }

  if (
    fiber.ref &&
    // It's `true` on the first render of the tag. We shouldn't run `onRef(null)`
    // in such a case.
    !dontUnsetRef
  ) {
    unsetRef(fiber, false);
  }

  // Run effects only when the DOM node is already mounted to a real DOM node.
  scheduleEffect(
    getAppByFiber(fiber),
    () => {
      const element = nullthrows(fiber.element) as HTMLElement;
      if (typeof ref === 'function') {
        ref(element);
      } else if (ref) {
        ref.current = element;
      }
    },
    // React calls ref handlers even before it runs layout effects.
    'refs',
  );

  fiber.ref = ref as typeof fiber.ref;
  return;
}
