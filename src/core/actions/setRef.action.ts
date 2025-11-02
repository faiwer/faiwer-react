import type { FiberNode } from 'faiwer-react/types';
import { nullthrows } from 'faiwer-react/utils';
import type { SetRefAction } from 'faiwer-react/types/actions';
import { unsetRef } from './helpers';
import { invalidateEffect } from '../reconcile/effects';
import { getAppByFiber } from '../reconcile/app';

/**
 * - A ref of a ref handler for the given node was:
 *   - set up
 *   - or replaced
 *
 * Removing node with a ref handler is handled in remove and replace actions.
 */
export function setRefAction(
  fiber: FiberNode,
  { ref, dontUnsetRef }: SetRefAction,
) {
  if (fiber.type !== 'tag') {
    throw new Error(`setRefAction is not compatible with ${fiber.type} nodes`);
  }

  if (
    fiber.ref &&
    // It's `true` on the 1st render of the tag. We shouldn't run `onRef(null)`
    // in such a case
    !dontUnsetRef
  ) {
    // ref.current = null | ref(null)
    unsetRef(fiber.ref);
  }

  // Run effects only when the DOMNode is already mounted to a real DOMnode.
  invalidateEffect(
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
