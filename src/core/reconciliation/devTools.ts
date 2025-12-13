import type { App, InternalRoot, ReactComponent } from 'faiwer-react/types';
import type {
  HMRFamily,
  ReactDevTools,
  ReactRenderer,
} from 'faiwer-react/types/devTools';
import { traverseFiberTree } from '../actions/helpers';
import { invalidateFiber } from './invalidateFiber';

export const createAppDevTools = (): App['devTools'] => ({
  global:
    (window as { __REACT_DEVTOOLS_GLOBAL_HOOK__?: ReactDevTools })
      .__REACT_DEVTOOLS_GLOBAL_HOOK__ ?? null,
  id: null,
  root: createInternalRoot(),
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

        if (updatedFamilies.has(family)) {
          // HMR considers it's safe to preserve the state. Thus we can just
          // rerender the component.
          fiber.component = family.current;
          invalidateFiber(fiber);
        } else if (staleFamilies.has(family)) {
        }
      });
    },

    setRefreshHandler: (handler) => (resolveFamily = handler),
  };
};
