import type {
  App,
  FiberNode,
  InternalRoot,
  ReactComponent,
} from 'faiwer-react/types';
import type {
  HMRFamily,
  ReactDevTools,
  ReactRenderer,
} from 'faiwer-react/types/devTools';
import { SKIP_CHILDREN, traverseFiberTree } from '../actions/helpers';
import { invalidateFiber } from './invalidateFiber';

export const createAppDevTools = (): App['devTools'] => ({
  global:
    (window as { __REACT_DEVTOOLS_GLOBAL_HOOK__?: ReactDevTools })
      .__REACT_DEVTOOLS_GLOBAL_HOOK__ ?? null,
  id: null,
  root: createInternalRoot(),
  remapped: null,
});

/** Creates a unique object that mimics `createRoot()._internalRoot. */
const createInternalRoot = (): InternalRoot => ({
  current: {
    alternate: null,
    current: null,
    element: null,
    memoizedState: null,
  },
});

export const prepareHMR = (app: App): void => {
  const globalTools = app.devTools.global;
  if (!globalTools || !globalTools.inject) return;

  const rendrerer: ReactRenderer = createHMRRenderer(app);
  const id = (app.devTools.id = globalTools.inject(rendrerer));
  globalTools.renderers.set(id, rendrerer);
  app.devTools.remapped = new WeakMap();
};

/**
 * Shallowly implements some of the React DevTools API used by
 * @vitejs/plugin-react to support Hot Module Replacements.
 */
const createHMRRenderer = (app: App): ReactRenderer => {
  // HMR code calls `setRefreshHandler` before it calls `scheduleRefresh`. The
  // given callback should be used to map old components with their new versions.
  let resolveFamily: null | ((component: ReactComponent) => HMRFamily | null) =
    null;

  return {
    // HMR code calls it right after the update is received. updatedFamilies &
    // staleFamilies are sets of HMRFamily records.
    // - `updated` means the component state can be preserved (hooks didn't
    //    change their order or count).
    // - `stale` meant the given component must be remounted.
    scheduleRefresh: (_root, { staleFamilies, updatedFamilies }) => {
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
          app.devTools.remapped?.set(component, family.current);
          fiber.data.remount = remount;
          invalidateFiber(remount ? getParentComponent(fiber) : fiber);
          if (remount) {
            return SKIP_CHILDREN;
          }
        }
      });
    },

    setRefreshHandler: (handler) => (resolveFamily = handler),
  };
};

const getParentComponent = (fiber: FiberNode): FiberNode =>
  fiber.parent.type === 'component'
    ? fiber.parent
    : getParentComponent(fiber.parent);
