import type { InternalRoot } from './app';
import type { ReactComponent } from './component';

/** A simple ref-like record that contains the freshest version of the given
 *  component. HMR engines internally map both old and new components to such a
 *  node. */
export type HMRFamily = {
  // Always leads to the freshest version of the given component family.
  current: ReactComponent<any>;
};

/** A shallow version of ReactRenderer that includes only HMR stuff. */
export type ReactRenderer = {
  /** HMR code calls this method before scheduleRefresh. The provided callback
   * is a way to get access to the HMR-family object of the given component
   * family. The only argument must be any of the component versions. */
  setRefreshHandler: (fn: (type: ReactComponent) => HMRFamily | null) => void;
  /** HMR code calls this method once it received component updates. */
  scheduleRefresh: (
    root: InternalRoot,
    update: {
      // Component families to remount.
      staleFamilies: Set<HMRFamily>;
      // … to rerender.
      updatedFamilies: Set<HMRFamily>;
    },
  ) => void;
};

/** window.__REACT_DEVTOOLS_GLOBAL_HOOK__. */
export type ReactDevTools = {
  renderers: Map<number, ReactRenderer>;
  supportsFiber: true;
  inject?: (renderer: ReactRenderer) => number;
  onCommitFiberRoot?: (
    id: number,
    root: InternalRoot,
    maybePriorityLevel: false,
    didError: boolean,
  ) => void;
};
