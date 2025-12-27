import type { App, FiberNode, ReactComponent } from 'faiwer-react/types';
import { SKIP_CHILDREN, traverseFiberTree } from '../actions/helpers';
import { getAppByFiber } from '../reconciliation/app';
import { invalidateFiber } from '../reconciliation/invalidateFiber';
import type { HMRFamily } from './types';

/**
 * Add support for Hot Module Replacement.
 */
export const prepareHMR = (app: App): void => {
  const { renderer } = app.devTools!;
  const remapped = (app.devTools!.remapped = new WeakMap());

  // HMR code calls `setRefreshHandler` before it calls `scheduleRefresh`. The
  // given callback should be used to map old components with their new versions.
  let resolveFamily: null | ((component: ReactComponent) => HMRFamily | null) =
    null;

  // HMR code calls it right after the update is received. updatedFamilies &
  // staleFamilies are sets of HMRFamily records.
  // - `updated` means the component state can be preserved (hooks didn't
  //    change their order or count).
  // - `stale` meant the given component must be remounted.
  renderer.scheduleRefresh = (_root, { staleFamilies, updatedFamilies }) => {
    if (!resolveFamily) {
      console.warn(`setRefreshHandler is not called`);
      return;
    }

    traverseFiberTree(app.root, (fiber) => {
      if (fiber.type !== 'component') return;

      const { component } = fiber;
      const family = resolveFamily!(component);
      // This component was not involved yet in HMR in any way.
      if (!family) return;

      const remount = staleFamilies.has(family);

      if (remount || updatedFamilies.has(family)) {
        remapped.set(component, family.current);
        if (remount) {
          fiber.data.remount = true;
          const parent = getParentComponent(fiber);
          invalidateFiber(parent ?? getAppByFiber(fiber).root);
        } else {
          invalidateFiber(fiber);
        }
        if (remount) {
          return SKIP_CHILDREN;
        }
      }
    });
  };

  renderer.setRefreshHandler = (handler) => (resolveFamily = handler);
};

const getParentComponent = (fiber: FiberNode): FiberNode | null =>
  fiber?.parent
    ? fiber.parent.type === 'component'
      ? fiber.parent
      : getParentComponent(fiber.parent)
    : null;
